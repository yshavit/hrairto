# CLAUDE.md

Project orientation and the conventions in `claude-instructions/` (start with
`0000-hrairto-overview.md`) are the source of truth for what Hrairto is and how it's
built. This file records working conventions that aren't obvious from the code.

## Commit messages

Subject line: `<domain>: brief description` — lowercase, imperative, no period.
Domains so far: `scaffolding`, `spec`, `yearlies`. Add a new domain when the work
doesn't fit an existing one.

Body (if needed): explain the *what and why* at a level that's useful in `git log`.
Don't list every file or struct changed — name concepts, not inventories. If the
body needs to enumerate things, use bullet points rather than prose enumeration.

## Keeping claude-instructions up to date

When a requirement changes or a design decision is made during implementation,
update the relevant `claude-instructions/` file in the same session — don't defer
it. If the change is a new first-class concept (e.g. a new domain term, a product
behaviour), add it to `0000-hrairto-overview.md`. If it supersedes something in a
step-specific spec, update that file and note that the code is now the canonical
source where applicable.

## Locale

`Calendar.locale` (a BCP 47 tag, e.g. `"en-US"`) is the single source of truth
for locale-sensitive formatting. Rules:

- **TypeScript**: pass `calendar.locale` to every `Intl.DateTimeFormat` call. Never
  hard-code a locale string literal in display code.
- **Rust**: generated labels (e.g. `QuarterDisplay.label`) are currently English-only.
  When i18n is added, `calendar.locale` becomes the Rust source of truth as well;
  until then, a comment in `calendar.rs` marks where to update.

Today the mock hardcodes `locale: "en-US"`. Adding real i18n means changing that
field in the backend config — display code doesn't need to change.

## Logic goes in Rust

Unless there is a compelling latency reason (e.g. keystroke handlers), put
non-trivial logic in Rust rather than TypeScript. "Non-trivial" includes anything
that uses non-trivial libraries (datetime math, UUID generation) or that implements
domain rules.

Two reasons:
1. Single source of truth — Rust is the only place the app's business logic lives.
2. CLI compatibility — a future Rust CLI can share the same library functions
   without re-implementing them in a second language.

The TypeScript layer should be limited to: rendering, layout, user interaction, and
display formatting (e.g. `Intl.DateTimeFormat` for human-readable labels).

## Rust documentation

Document fields on the field, not in the struct's doc comment. A struct's `///`
should describe the type as a whole and any invariants that span multiple fields
(e.g. "all weights in a period must sum to 1.0"); facts about a single field
(units, 1-based ranges, "Unix timestamp UTC", "None until completed") belong on a
`///` comment on that field, where rustdoc renders them next to it.

Prefer `///` over trailing inline `//` comments for field documentation — inline
`//` comments do not appear in rustdoc at all.

Don't write docs that only restate what the name and type already make obvious. A
doc comment must add information a reader couldn't get from the signature — units,
ranges, invariants, edge cases, rationale. For example `/// Identifies a Foo` on a
`FooId` newtype says nothing the name doesn't; omit it. When there's nothing
non-obvious to say, write no doc at all.
