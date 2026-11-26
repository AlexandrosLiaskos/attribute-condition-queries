/** The kind of a field: its values are compared as numbers, as days, or as text (yes/no included). */
export type Kind = "number" | "date" | "text" | "yes/no";

export type Relation = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains" | "not_contains" | "starts" | "ends" | "empty" | "filled";

export type Join = "AND" | "OR";

/** One condition on one field. `join` says how it joins the result of the conditions above it; that of the first is unused. */
export interface Condition {
  readonly join: Join;
  readonly field: string;
  readonly relation: Relation;
  readonly value: string;
  /** Any identifier an interface needs; it plays no part in the query. */
  readonly id?: number | string;
}
