# 09: Full-bleed HTML page as a 16:9 escape hatch

**Spec:** `docs/specs/html-page-layout.md`

**What to build:** A page with `layout: "html"` fills the 16:9 stage from a per-week `.html` fragment (`htmlFile` is a basename like `p03.html`). Preview mounts in Shadow DOM; PNG capture injects the same sanitized markup into light DOM. Workshop edits path / title / notes / hidden only. Clone copies html files as-is.

**Blocked by:** 02: Edit a week in the workshop and save; 07: Export visible pages as PNG and clipboard

**Status:** ready-for-agent

- [ ] `parseWeekDocument` accepts html pages without items/panel; two-column unchanged
- [ ] Path resolve + sanitize seam: week-relative `.html` only; strip script / `on*` / `javascript:`
- [ ] Stage preview uses Shadow DOM; capture host uses light DOM; export still PNG
- [ ] Dev/static serve of week-dir html files; missing file shows stage warning
- [ ] Editor shows htmlFile when layout is html; no layout dropdown; edit lock applies
- [ ] Clone copies referenced html files into the new week dir; `htmlFile` basename unchanged
- [ ] Docs: week JSON reference, clone how-to, workshop architecture
- [ ] Tests on the three agreed seams (parse, path+sanitize, weeks-store clone files)

## Comments

- Grilling 2026-09-03. Spec lives under `docs/specs/` (not duplicated here).
