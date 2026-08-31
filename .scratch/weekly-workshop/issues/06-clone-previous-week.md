# 06: New week clones the previous week

**What to build:** Starting a new week creates `weeks/YYYY-MM-DD.json` named for that Monday, copying page count, panel kinds, and hide flags from the latest week, with titles and body text cleared.

**Blocked by:** 02: Edit a week in the workshop and save

**Status:** ready-for-agent

- [ ] New week file name is the Monday date
- [ ] Structure (pages, `panel.kind`, hidden) matches the previous week
- [ ] Titles, items, panel bodies, and notes are empty
- [ ] Tests cover clone-from-previous with a two-week fixture

## Comments
