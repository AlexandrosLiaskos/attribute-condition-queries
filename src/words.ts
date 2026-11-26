// The words of queries and of their problems, in English and Greek. Pass your own table for another language.

import type { Relation } from "./types.js";

export interface Words {
  /** How each relation is read, for numbers and text. */
  readonly relations: Readonly<Record<Relation, string>>;
  /** How the relations of order are read for dates. */
  readonly dateRelations: Readonly<Partial<Record<Relation, string>>>;
  readonly and: string;
  readonly or: string;
  /** A value in quotation marks. */
  readonly quoted: (value: string) => string;
  readonly noConditions: string;
  readonly unknownField: (number: number) => string;
  readonly noValue: (number: number) => string;
  readonly notANumber: (number: number, value: string) => string;
  readonly notADate: (number: number, value: string) => string;
}

export const ENGLISH: Words = {
  relations: {
    eq: "equals",
    neq: "does not equal",
    gt: "is greater than",
    gte: "is at least",
    lt: "is less than",
    lte: "is at most",
    contains: "contains",
    not_contains: "does not contain",
    starts: "starts with",
    ends: "ends with",
    empty: "is empty",
    filled: "is not empty",
  },
  dateRelations: { eq: "is on", neq: "is not on", gt: "is after", gte: "is on or after", lt: "is before", lte: "is on or before" },
  and: "AND",
  or: "OR",
  quoted: (value) => `“${value}”`,
  noConditions: "Add at least one complete condition.",
  unknownField: (n) => `Condition ${n} names a field that is not shown on this website.`,
  noValue: (n) => `Condition ${n} has no value. Select or enter a value, or remove the condition.`,
  notANumber: (n, value) => `Condition ${n}: “${value}” is not a number.`,
  notADate: (n, value) => `Condition ${n}: “${value}” is not a date (YYYY-MM-DD).`,
};

export const GREEK: Words = {
  relations: {
    eq: "ισούται με",
    neq: "δεν ισούται με",
    gt: "είναι μεγαλύτερο από",
    gte: "είναι τουλάχιστον",
    lt: "είναι μικρότερο από",
    lte: "είναι το πολύ",
    contains: "περιέχει",
    not_contains: "δεν περιέχει",
    starts: "αρχίζει με",
    ends: "τελειώνει σε",
    empty: "είναι κενό",
    filled: "δεν είναι κενό",
  },
  dateRelations: {
    eq: "είναι στις",
    neq: "δεν είναι στις",
    gt: "είναι μετά τις",
    gte: "είναι από τις",
    lt: "είναι πριν από τις",
    lte: "είναι έως τις",
  },
  and: "ΚΑΙ",
  or: "Ή",
  quoted: (value) => `«${value}»`,
  noConditions: "Προσθέστε τουλάχιστον μία πλήρη συνθήκη.",
  unknownField: (n) => `Η συνθήκη ${n} αναφέρει πεδίο που δεν εμφανίζεται σε αυτόν τον ιστότοπο.`,
  noValue: (n) => `Η συνθήκη ${n} δεν έχει τιμή. Επιλέξτε ή γράψτε μια τιμή, ή αφαιρέστε τη συνθήκη.`,
  notANumber: (n, value) => `Συνθήκη ${n}: το «${value}» δεν είναι αριθμός.`,
  notADate: (n, value) => `Συνθήκη ${n}: το «${value}» δεν είναι ημερομηνία (ΕΕΕΕ-ΜΜ-ΗΗ).`,
};
