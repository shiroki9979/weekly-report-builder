# 01: Preview a week JSON on the 16:9 stage

**What to build:** Opening the app loads a week file and shows one two-column slide with a table panel on the 16:9 stage, using the blue/white PPT tokens. The week document type already allows `layout` and `panel.kind` to grow later. `fields` is named only in the spec, not rendered.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] A week JSON with `layout: "two-column"` and `panel.kind: "table"` renders title, three left items, and a right table on a 16:9 stage
- [ ] Stage colors match the existing weekly PPT tokens; no shadcn components on the canvas
- [ ] Document types accept future `layout` values and the four v1 panel kinds without rewriting old files
- [ ] Unit tests cover parsing the fixture and the public two-column + table render

## Comments
