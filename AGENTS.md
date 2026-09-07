# AGENTS.md

## Language

- **Workshop chrome** (shadcn shell): English UI strings.
- **In-app copy**: English — placeholders, labels, errors, empty states.
- **16:9 stage**: no shadcn; slide content comes from `weeks/*.json` and may be any language.
- **Code comments**: Traditional Chinese (why, not what).
- **README / agent docs**: English unless the user asks otherwise.

See `.cursor/rules/language.mdc`.

## Agent skills

### Issue tracker

Issues live in GitHub Issues. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root `CONTEXT.md` and `docs/adr/`. See `docs/agents/domain.md`.
