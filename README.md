# Attribute Condition Queries without Code Evaluation

A query builder lets visitors of a web map or a data catalogue narrow its records: "Country equals Greece, OR
Country equals Cyprus, AND Depth is at least 3". This library holds everything behind such a builder:

- the relations offered for each kind of field;
- the reading of typed numbers and dates;
- the evaluation of the conditions on the records;
- the sentence that shows the query back, with brackets;
- the messages for an incomplete query;
- the text that carries a query in a URL.

The conditions are evaluated as data, without `eval` or any other code built from text. A query typed by a visitor, or
received in an address, can therefore do nothing but compare values. A test checks the source for that.

No dependencies; an ES module with types. It works in the browser and in Node.js.

## Installation

```sh
npm install attribute-condition-queries
```

## Use

```ts
import { compileQuery, problemOf, queryText, encodeQuery, type Condition, type Kind } from "attribute-condition-queries";

const kinds: Record<string, Kind> = { country: "text", depth: "number", surveyed: "date" };
const kindOf = (field: string) => kinds[field] ?? "text";

const query: Condition[] = [
  { join: "AND", field: "country", relation: "eq", value: "Greece" },
  { join: "OR", field: "country", relation: "eq", value: "Cyprus" },
  { join: "AND", field: "depth", relation: "gte", value: "3" },
];

problemOf(query, Object.keys(kinds), kindOf); // null: the query can be applied
const shown = records.filter((record) => compileQuery(query, kindOf)(record.properties));
queryText(query, (field) => field, kindOf); // (country equals “Greece” OR country equals “Cyprus”) AND depth is at least “3”
location.search = `?query=${encodeURIComponent(encodeQuery(query))}`; // read back with decodeQuery
```

## The rules

**Kinds and relations.** Each field has a kind, which decides the relations it is offered and how values are
compared:

| Kind     | Relations                                                                                              | Compared                                                                |
| -------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `text`   | equals, does not equal, contains, does not contain, starts with, ends with, is empty, is not empty     | as text, without case or spaces at either end ("Crete " equals "crete") |
| `number` | equals, does not equal, is greater than, is at least, is less than, is at most, is empty, is not empty | as numbers                                                              |
| `date`   | is on, is not on, is after, is on or after, is before, is on or before, is empty, is not empty         | by day (`YYYY-MM-DD`); a time after the day is ignored                  |
| `yes/no` | equals, does not equal, is empty, is not empty                                                         | as text, without case                                                   |

**Typed numbers.** A point is the decimal mark. Commas that separate groups of three digits are thousands separators:
"1,000" is a thousand and "1,234,567.5" works too. A single comma otherwise is the decimal mark: "1,5" and "0,500".
Text that is not a number, and numbers too large for JavaScript, make the condition incomplete.

**Typed dates.** A date is `YYYY-MM-DD`, optionally with a time. An impossible day such as 30 February makes the
condition incomplete.

**Missing values.** A record without a value (empty, spaces only, `null` or absent) meets only "is empty". It does not
meet "does not equal" or "does not contain": a record that says nothing is not taken to differ.

**Order of evaluation.** The conditions are combined in the order in which they are listed: each one joins the
result of those above it with its AND or OR. "A OR B AND C" is "(A OR B) AND C", and `queryText` writes the brackets
wherever AND and OR follow each other, so the sentence the person reads is the query that runs.

**Lists of values.** For "equals" and "does not equal" on a text or yes/no field, `choosesValue` tells an interface
to offer the field's values as a list. That holds when the field has at most 60 values (`CHOICE_LIMIT`); a field with
more takes a typed value, so a menu never has thousands of entries.

## Interface

| Function                                                                             | Gives                                                                                        |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `relationsOf(kind)`                                                                  | The relations of a kind, in menu order.                                                      |
| `needsValue(relation)`, `choosesValue(relation, kind, valueCount)`                   | Whether a relation takes a value, and whether it is chosen from a list.                      |
| `numberOf(text)`, `dayOf(text)`                                                      | A typed number or day, or `null`.                                                            |
| `meets(value, condition, kind)`                                                      | Whether one value meets one condition.                                                       |
| `compileQuery(conditions, kindOf)`                                                   | A test of records, with the values read once; `passesQuery` tests one record.                |
| `complete(condition, kind)`, `problemOf(conditions, fields, kindOf, words)`          | Whether a condition can run, and the first problem of a query as a message.                  |
| `queryText(conditions, label, kindOf, words)`, `relationText(relation, kind, words)` | The query and a relation in words.                                                           |
| `encodeQuery(conditions)`, `decodeQuery(text)`                                       | A query as compact text for a URL, and back; `decodeQuery` returns `null` for anything else. |

`words` is a table of the words of queries and messages. `ENGLISH` (the default) and `GREEK` are included; pass your
own `Words` for another language.

## Origin

The library comes from the query builder of the WebGIS Builder of the National and Kapodistrian University of Athens.
Version 0.1.0 adds date fields, Greek words and addresses to it, and fixes four points of its review:

- record values are compared without spaces at either end;
- "1,000" is read as a thousand;
- the rules for missing values are stated;
- fields with many values get a typed value instead of a list.

## Citation

The citation of the software is given in [CITATION.cff](CITATION.cff). Each release is archived on Zenodo with its own
DOI.

## Licence

Copyright © 2026 Alexandros Liaskos, National and Kapodistrian University of Athens.

This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General
Public License, version 3, as published by the Free Software Foundation ([LICENSE](LICENSE)). It is distributed in the
hope that it will be useful, but without any warranty; without even the implied warranty of merchantability or fitness
for a particular purpose.
