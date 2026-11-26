import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CHOICE_LIMIT,
  GREEK,
  choosesValue,
  compileQuery,
  complete,
  dayOf,
  decodeQuery,
  encodeQuery,
  meets,
  numberOf,
  passesQuery,
  problemOf,
  queryText,
  relationsOf,
  type Condition,
  type Kind,
} from "../src/index.js";

const condition = (field: string, relation: Condition["relation"], value = "", join: Condition["join"] = "AND"): Condition => ({
  join,
  field,
  relation,
  value,
});
const KINDS: Record<string, Kind> = { country: "text", island: "text", depth: "number", surveyed: "date", active: "yes/no" };
const kindOf = (field: string): Kind => KINDS[field] ?? "text";
const label = (field: string) => field.charAt(0).toUpperCase() + field.slice(1);

describe("typed numbers", () => {
  it.each([
    ["1.5", 1.5],
    ["1,5", 1.5],
    ["0,500", 0.5],
    ["12,34", 12.34],
    ["1,000", 1000],
    ["1,234,567.5", 1234567.5],
    ["-2", -2],
    [" 3 ", 3],
    ["2e3", 2000],
    ["abc", null],
    ["1,2,3", null],
    ["1e999", null],
    ["", null],
  ])("%s → %s", (typed, expected) => expect(numberOf(typed)).toBe(expected));
});

describe("days", () => {
  it.each([
    ["2021-04-05", "2021-04-05"],
    ["2021-04-05T10:30:00Z", "2021-04-05"],
    ["2021-04-05 10:30:00+02:00", "2021-04-05"],
    ["2023-02-30", null],
    ["21-4-5", null],
    ["yesterday", null],
  ])("%s → %s", (typed, expected) => expect(dayOf(typed)).toBe(expected));
});

describe("one condition", () => {
  it("compares text without case or spaces at either end", () => {
    expect(meets("Crete ", condition("island", "eq", "crete"), "text")).toBe(true);
    expect(meets("Crete", condition("island", "eq", " CRETE "), "text")).toBe(true);
    expect(meets("Heraklion, Crete", condition("island", "contains", "crete"), "text")).toBe(true);
    expect(meets("Crete", condition("island", "starts", "cr"), "text")).toBe(true);
    expect(meets("Crete", condition("island", "ends", "te"), "text")).toBe(true);
  });

  it("meets only “is empty” when the record has no value", () => {
    for (const value of [null, undefined, "", "  "]) {
      expect(meets(value, condition("island", "empty"), "text")).toBe(true);
      expect(meets(value, condition("island", "neq", "Crete"), "text")).toBe(false);
      expect(meets(value, condition("island", "not_contains", "x"), "text")).toBe(false);
      expect(meets(value, condition("depth", "lt", "5"), "number")).toBe(false);
    }
    expect(meets("Crete", condition("island", "filled"), "text")).toBe(true);
  });

  it("compares numbers as numbers, written in a record as numbers or text", () => {
    expect(meets(2.5, condition("depth", "gt", "2"), "number")).toBe(true);
    expect(meets("2,5", condition("depth", "gte", "2.5"), "number")).toBe(true);
    expect(meets(10, condition("depth", "lte", "9"), "number")).toBe(false);
    expect(meets(1000, condition("depth", "eq", "1,000"), "number")).toBe(true);
    expect(meets("deep", condition("depth", "neq", "1"), "number")).toBe(false);
  });

  it("compares dates by their day", () => {
    expect(meets("2021-04-05", condition("surveyed", "lt", "2021-05-01"), "date")).toBe(true);
    expect(meets("2021-04-05T23:59:00Z", condition("surveyed", "eq", "2021-04-05"), "date")).toBe(true);
    expect(meets("2021-04-05", condition("surveyed", "gte", "2021-04-06"), "date")).toBe(false);
    expect(meets("unknown", condition("surveyed", "neq", "2021-04-05"), "date")).toBe(false);
  });

  it("compares yes/no as text", () => {
    expect(meets(true, condition("active", "eq", "TRUE"), "yes/no")).toBe(true);
    expect(meets(false, condition("active", "eq", "true"), "yes/no")).toBe(false);
  });
});

describe("several conditions", () => {
  const records = [
    { country: "Greece", depth: 1 },
    { country: "Cyprus", depth: 3 },
    { country: "Italy", depth: 5 },
    { country: "Greece", depth: 4 },
  ];
  const query = [condition("country", "eq", "Greece"), condition("country", "eq", "Cyprus", "OR"), condition("depth", "gte", "3", "AND")];

  it("are combined in the order listed, each joining the result above it", () => {
    const passes = compileQuery(query, kindOf);
    expect(records.filter(passes)).toEqual([records[1], records[3]]);
    expect(records.filter((record) => passesQuery(record, query, kindOf))).toEqual([records[1], records[3]]);
  });

  it("read as a sentence with brackets where AND and OR follow each other", () => {
    expect(queryText(query, label, kindOf)).toBe("(Country equals “Greece” OR Country equals “Cyprus”) AND Depth is at least “3”");
    expect(queryText([condition("surveyed", "lt", "2021-05-01"), condition("island", "filled", "", "AND")], label, kindOf)).toBe(
      "Surveyed is before “2021-05-01” AND Island is not empty",
    );
  });

  it("read in Greek", () => {
    expect(queryText(query, label, kindOf, GREEK)).toBe(
      "(Country ισούται με «Greece» Ή Country ισούται με «Cyprus») ΚΑΙ Depth είναι τουλάχιστον «3»",
    );
  });
});

describe("checks", () => {
  const fields = ["country", "depth", "surveyed"];

  it("tell what prevents the conditions from being applied", () => {
    expect(problemOf([], fields, kindOf)).toBe("Add at least one complete condition.");
    expect(problemOf([condition("colour", "eq", "red")], fields, kindOf)).toBe(
      "Condition 1 names a field that is not shown on this website.",
    );
    expect(problemOf([condition("country", "eq", " ")], fields, kindOf)).toBe(
      "Condition 1 has no value. Select or enter a value, or remove the condition.",
    );
    expect(problemOf([condition("country", "eq", "Greece"), condition("depth", "gt", "deep")], fields, kindOf)).toBe(
      "Condition 2: “deep” is not a number.",
    );
    expect(problemOf([condition("surveyed", "lt", "2023-02-30")], fields, kindOf)).toBe(
      "Condition 1: “2023-02-30” is not a date (YYYY-MM-DD).",
    );
    expect(problemOf([condition("depth", "empty")], fields, kindOf)).toBeNull();
    expect(problemOf([], fields, kindOf, GREEK)).toBe("Προσθέστε τουλάχιστον μία πλήρη συνθήκη.");
  });

  it("know which conditions are complete", () => {
    expect(complete(condition("depth", "gt", "2"), "number")).toBe(true);
    expect(complete(condition("depth", "gt", "x"), "number")).toBe(false);
    expect(complete(condition("surveyed", "lt", "2021-13-01"), "date")).toBe(false);
    expect(complete(condition("country", "filled"), "text")).toBe(true);
  });
});

describe("menus", () => {
  it("offer the relations of each kind", () => {
    expect(relationsOf("number")).toEqual(["eq", "neq", "gt", "gte", "lt", "lte", "empty", "filled"]);
    expect(relationsOf("date")).toEqual(relationsOf("number"));
    expect(relationsOf("text")).toContain("contains");
    expect(relationsOf("yes/no")).toEqual(["eq", "neq", "empty", "filled"]);
  });

  it("offer a list of values only for a field with few of them", () => {
    expect(choosesValue("eq", "text", 12)).toBe(true);
    expect(choosesValue("eq", "text", CHOICE_LIMIT + 1)).toBe(false);
    expect(choosesValue("contains", "text", 12)).toBe(false);
    expect(choosesValue("eq", "number", 3)).toBe(false);
  });
});

describe("addresses", () => {
  const query = [condition("country", "eq", "Greece"), condition("depth", "gte", "2,5", "OR")];

  it("carry a query and give it back", () => {
    const decoded = decodeQuery(decodeURIComponent(encodeURIComponent(encodeQuery(query))));
    expect(decoded).toEqual(query);
  });

  it("refuse text that is not a query", () => {
    for (const text of ["", "{}", "[1]", '[["a","eq"]]', '[["a","eval","x"]]', '[["a","eq","x"],["XOR","b","eq","y"]]', "not json"]) {
      expect(decodeQuery(text)).toBeNull();
    }
  });
});

describe("the source", () => {
  it("evaluates no code built from text", () => {
    const folder = new URL("../src/", import.meta.url);
    for (const name of readdirSync(folder)) {
      const source = readFileSync(new URL(name, folder), "utf-8");
      expect(source, name).not.toMatch(/\beval\s*\(|new\s+Function\s*\(|\bFunction\s*\(|setTimeout\s*\(\s*["'`]/);
    }
  });
});
