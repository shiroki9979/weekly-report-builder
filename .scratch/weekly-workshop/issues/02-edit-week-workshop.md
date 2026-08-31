# 02: Edit a week in the workshop and save

**What to build:** From the shadcn workshop shell, the user picks a week, edits title / three items / table panel / speaker notes, toggles hide on a page, and writes the JSON back. The 16:9 preview follows the form.

**Blocked by:** 01: Preview a week JSON on the 16:9 stage

**Status:** done

- [x] User can list week files and open one
- [x] Form changes to title, items, table, and notes update the preview without a reload
- [x] Hide-page persists in the week JSON; hidden pages still appear in the editor
- [x] Saving writes `weeks/YYYY-MM-DD.json` and a reload shows the same content
- [x] Tests cover form → document mapping and hide persistence

## Comments
