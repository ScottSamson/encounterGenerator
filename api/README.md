# encounterGenerator

## TODO

Outstanding cleanup/security items, roughly in priority order:

1. **[Critical] Remove `eval()` on user-supplied query params** ([services/encounter.service.ts](src/services/encounter.service.ts) — `parseParams`). `avgPlayerLevel`, `partySize`, `monsterCR`, and `monsterXP` are all passed through `eval()`. This is a live remote-code-execution vulnerability on a publicly deployed endpoint, not just a local concern. The current bounds checks validate `eval()`'s *return value* after the fact — they do not stop the arbitrary code execution itself. Replace with real parsers: plain integers via a regex + `Number()` (not `Number()` alone — `Number("")` and `Number(" ")` both evaluate to `0`), and a small fraction-aware parser for `monsterCR` (supports D&D notation like `"1/2"`, which is likely why `eval()` was used originally).
2. **Error responses leak internal error objects to clients** — every route does `res.status(500).json({ message: "...", error: err })`. Log `err` server-side only (`console.error`) and return a generic client-safe message.
3. **Leftover debug `console.log`s** (`console.log(xpThresholds)`, `console.log("Querying monsters with:", query)`, etc.) spam CloudWatch Logs in production and echo internal query structure. Remove or gate behind a debug flag.
4. **Repeated try/catch + `res.status(500)` boilerplate** in every route handler — extract into a shared Express error-handling middleware instead of duplicating it per route.
5. **Hardcoded magic strings** — `xpThresholds['2024']` and the `"low"/"moderate"/"high"` difficulty labels are each repeated 3 times in `generateEncounters`. Pull into a constant or iterate over an array instead.
6. **No tests** for `generateMonsterSet`'s budget-filling loop — worth it given we already found and fixed one real infinite-loop bug in that exact function (monsters with `xp: 0` could get selected forever once the remaining budget dropped below every other monster's cost).
