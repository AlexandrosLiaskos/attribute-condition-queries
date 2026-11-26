/**
 * Attribute Condition Queries without Code Evaluation.
 *
 * Conditions on the fields of records (equals, contains, is greater than, is before, is empty…), joined with AND and
 * OR, evaluated without eval or any other code built from text, read back as a sentence with brackets, checked with
 * messages for the person, and written into a URL.
 *
 * Copyright (C) 2026 Alexandros Liaskos
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { Condition, Join, Kind, Relation } from "./types.js";
import { ENGLISH, type Words } from "./words.js";

export type { Condition, Join, Kind, Relation } from "./types.js";
export { ENGLISH, GREEK, type Words } from "./words.js";

const RELATIONS: readonly Relation[] = [
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "contains",
  "not_contains",
  "starts",
  "ends",
  "empty",
  "filled",
];

/** At most this many values are offered as a list to choose from; a field with more takes a typed value. */
export const CHOICE_LIMIT = 60;

/** The relations offered for a field of a kind, in the order of a menu. */
export function relationsOf(kind: Kind): Relation[] {
  if (kind === "number" || kind === "date") return ["eq", "neq", "gt", "gte", "lt", "lte", "empty", "filled"];
  if (kind === "yes/no") return ["eq", "neq", "empty", "filled"];
  return ["eq", "neq", "contains", "not_contains", "starts", "ends", "empty", "filled"];
}

/** Whether a relation takes a value: all but "is empty" and "is not empty". */
export const needsValue = (relation: Relation): boolean => relation !== "empty" && relation !== "filled";

/**
 * Whether the value of a condition is chosen from the values of the field rather than typed: for "equals" and "does not
 * equal" on a text or yes/no field, when the field has at most CHOICE_LIMIT values. `valueCount` is the number of
 * different values of the field.
 */
export const choosesValue = (relation: Relation, kind: Kind, valueCount = 0): boolean =>
  (kind === "text" || kind === "yes/no") && (relation === "eq" || relation === "neq") && valueCount <= CHOICE_LIMIT;

const PLAIN_NUMBER = /^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i;
const THOUSANDS = /^[-+]?[1-9]\d{0,2}(,\d{3})+(\.\d+)?$/;

/**
 * A typed number, or null. A point is the decimal mark. Commas that separate groups of three digits are thousands
 * separators ("1,000" and "1,234,567.5"); a single comma otherwise is the decimal mark ("1,5", "0,500").
 */
export function numberOf(value: string): number | null {
  let typed = value.trim();
  if (THOUSANDS.test(typed)) typed = typed.replaceAll(",", "");
  else if (!typed.includes(".") && (typed.match(/,/g) ?? []).length === 1) typed = typed.replace(",", ".");
  if (!PLAIN_NUMBER.test(typed)) return null;
  const number = Number(typed);
  return Number.isFinite(number) ? number : null;
}

/** A typed or stored date as its day (YYYY-MM-DD), or null. A time after the day is ignored; an impossible day is null. */
export function dayOf(value: string): string | null {
  const match = /^\s*(\d{4})-(\d{2})-(\d{2})(?:[T ][\d:.]+(?:Z|[+-]\d{2}:?\d{2})?)?\s*$/.exec(value);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

const missing = (value: unknown) => value === null || value === undefined || (typeof value === "string" && value.trim() === "");

/** The value of a field as text: a number or yes/no as JavaScript writes it, any other value that is not text as JSON. */
export const textOf = (value: unknown): string =>
  value === null || value === undefined
    ? ""
    : typeof value === "string"
      ? value
      : typeof value === "number" || typeof value === "boolean"
        ? String(value)
        : JSON.stringify(value);

function compare(left: number | string, right: number | string, relation: Relation): boolean {
  switch (relation) {
    case "eq":
      return left === right;
    case "neq":
      return left !== right;
    case "gt":
      return left > right;
    case "gte":
      return left >= right;
    case "lt":
      return left < right;
    case "lte":
      return left <= right;
    default:
      return false;
  }
}

/** A condition with its value read once, for evaluation on many records. */
interface Prepared {
  readonly relation: Relation;
  readonly kind: Kind;
  readonly number: number | null;
  readonly day: string | null;
  readonly text: string;
}

const prepare = (condition: Condition, kind: Kind): Prepared => ({
  relation: condition.relation,
  kind,
  number: kind === "number" ? numberOf(condition.value) : null,
  day: kind === "date" ? dayOf(condition.value) : null,
  text: condition.value.trim().toLocaleLowerCase(),
});

function holds(value: unknown, condition: Prepared): boolean {
  if (condition.relation === "empty") return missing(value);
  if (condition.relation === "filled") return !missing(value);
  // A record without a value meets only "is empty": not "does not equal", not "does not contain".
  if (missing(value)) return false;
  if (condition.kind === "number") {
    const left = typeof value === "number" ? value : numberOf(textOf(value));
    if (left === null || condition.number === null || !Number.isFinite(left)) return false;
    return compare(left, condition.number, condition.relation);
  }
  if (condition.kind === "date") {
    const left = dayOf(textOf(value));
    if (left === null || condition.day === null) return false;
    return compare(left, condition.day, condition.relation);
  }
  // Text is compared without regard to case or to spaces at either end.
  const left = textOf(value).trim().toLocaleLowerCase();
  switch (condition.relation) {
    case "eq":
    case "neq":
      return compare(left, condition.text, condition.relation);
    case "contains":
      return left.includes(condition.text);
    case "not_contains":
      return !left.includes(condition.text);
    case "starts":
      return left.startsWith(condition.text);
    case "ends":
      return left.endsWith(condition.text);
    default:
      return false;
  }
}

/** Whether the value of a field in one record meets one condition. */
export const meets = (value: unknown, condition: Condition, kind: Kind): boolean => holds(value, prepare(condition, kind));

/**
 * A test of records by the conditions, prepared once. The conditions are combined in the order in which they are
 * listed: each one joins the result of those above it with AND or OR. "A OR B AND C" is therefore "(A OR B) AND C",
 * as queryText writes it.
 */
export function compileQuery(
  conditions: readonly Condition[],
  kindOf: (field: string) => Kind,
): (properties: Record<string, unknown>) => boolean {
  const prepared = conditions.map((condition) => ({
    field: condition.field,
    join: condition.join,
    test: prepare(condition, kindOf(condition.field)),
  }));
  return (properties) => {
    let result = true;
    prepared.forEach((condition, index) => {
      const met = holds(properties[condition.field], condition.test);
      result = index === 0 ? met : condition.join === "OR" ? result || met : result && met;
    });
    return result;
  };
}

/** Whether a record passes the conditions (see compileQuery for the order of evaluation). */
export const passesQuery = (
  properties: Record<string, unknown>,
  conditions: readonly Condition[],
  kindOf: (field: string) => Kind,
): boolean => compileQuery(conditions, kindOf)(properties);

/** Whether a condition can be evaluated: it has a value where its relation needs one, of the kind of its field. */
export function complete(condition: Condition, kind: Kind): boolean {
  if (!needsValue(condition.relation)) return true;
  if (condition.value.trim() === "") return false;
  if (kind === "number") return numberOf(condition.value) !== null;
  if (kind === "date") return dayOf(condition.value) !== null;
  return true;
}

/** What prevents the conditions from being applied, as a message for the person, or null when they can be applied. */
export function problemOf(
  conditions: readonly Condition[],
  fields: readonly string[],
  kindOf: (field: string) => Kind,
  words: Words = ENGLISH,
): string | null {
  if (conditions.length === 0) return words.noConditions;
  for (const [index, condition] of conditions.entries()) {
    const number = index + 1;
    if (!fields.includes(condition.field)) return words.unknownField(number);
    if (!needsValue(condition.relation)) continue;
    const value = condition.value.trim();
    if (value === "") return words.noValue(number);
    const kind = kindOf(condition.field);
    if (kind === "number" && numberOf(value) === null) return words.notANumber(number, value);
    if (kind === "date" && dayOf(value) === null) return words.notADate(number, value);
  }
  return null;
}

/** How a relation is read for a field of a kind. */
export const relationText = (relation: Relation, kind: Kind, words: Words = ENGLISH): string =>
  (kind === "date" ? words.dateRelations[relation] : undefined) ?? words.relations[relation];

/**
 * The query in words. Brackets show the order of evaluation wherever AND and OR follow each other:
 * "(Country equals “Greece” OR Country equals “Cyprus”) AND Depth is at least “2”".
 */
export function queryText(
  conditions: readonly Condition[],
  label: (field: string) => string,
  kindOf: (field: string) => Kind = () => "text",
  words: Words = ENGLISH,
): string {
  let text = "";
  conditions.forEach((condition, index) => {
    const value = needsValue(condition.relation) ? ` ${words.quoted(condition.value.trim())}` : "";
    const part = `${label(condition.field)} ${relationText(condition.relation, kindOf(condition.field), words)}${value}`;
    if (index === 0) {
      text = part;
      return;
    }
    const before = conditions[index - 1];
    if (index > 1 && before && before.join !== condition.join) text = `(${text})`;
    text = `${text} ${condition.join === "OR" ? words.or : words.and} ${part}`;
  });
  return text;
}

/** The conditions as text for a URL (for example ?query=…): compact JSON, to be encoded with encodeURIComponent. */
export const encodeQuery = (conditions: readonly Condition[]): string =>
  JSON.stringify(
    conditions.map(({ join, field, relation, value }, index) => (index === 0 ? [field, relation, value] : [join, field, relation, value])),
  );

/** The conditions of a text made by encodeQuery, or null when the text is not such a query. */
export function decodeQuery(text: string): Condition[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;
  const conditions: Condition[] = [];
  for (const [index, item] of parsed.entries()) {
    if (!Array.isArray(item) || item.length !== (index === 0 ? 3 : 4) || !item.every((part) => typeof part === "string")) return null;
    const [join, field, relation, value] = (index === 0 ? ["AND", ...item] : item) as [string, string, string, string];
    if ((join !== "AND" && join !== "OR") || !RELATIONS.includes(relation as Relation)) return null;
    conditions.push({ join: join as Join, field, relation: relation as Relation, value });
  }
  return conditions;
}
