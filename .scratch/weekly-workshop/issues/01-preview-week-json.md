# 01: Preview a week JSON on the 16:9 stage

**What to build:** Opening the app loads a week file and shows one two-column slide with a table panel on the 16:9 stage, using the blue/white PPT tokens. The week document type already allows `layout` and `panel.kind` to grow later. `fields` is named only in the spec, not rendered.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] A week JSON with `layout: "two-column"` and `panel.kind: "table"` renders title, three left items, and a right table on a 16:9 stage
- [x] Stage colors match the existing weekly PPT tokens; no shadcn components on the canvas
- [x] Document types accept future `layout` values and the four v1 panel kinds without rewriting old files
- [x] Unit tests cover parsing the fixture and the public two-column + table render

## Comments
