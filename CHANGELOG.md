# Changelog

All notable changes to this library are recorded in this file. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - Unreleased

### Added

- Conditions on text, number, date and yes/no fields, joined with AND and OR in the order listed, evaluated without
  code built from text (`meets`, `compileQuery`, `passesQuery`).
- Typed numbers with decimal commas and thousands separators, and typed dates, with impossible days refused.
- The query in words with brackets, the first problem of a query as a message, in English and Greek.
- A compact text for addresses (`encodeQuery`, `decodeQuery`).
- `choosesValue` offers a list of values only for fields with at most 60 of them.
