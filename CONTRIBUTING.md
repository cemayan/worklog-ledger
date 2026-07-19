# Contributing to Worklog Ledger

Thanks for your interest! Bug reports, feature ideas and PRs are all welcome.

## Ground rules

- **Open an issue before large changes.** For anything beyond a small fix, let's
  agree on the approach first — it protects your time.
- **Scope:** the extension has a single purpose (Jira Cloud worklogs → calendar +
  billing reports). Features outside that scope will likely be declined, however
  well built.
- **Privacy invariants are non-negotiable.** No analytics, no tracking, no new
  network destinations beyond the user's own Jira site and the license endpoint,
  and no new host permissions without a very strong case. PRs that violate these
  will not be merged.
- Please follow the [code of conduct](CODE_OF_CONDUCT.md).

## Development setup

```sh
npm install
npm run dev     # vite build --watch → dist/
npm run build   # typecheck + production build → dist/
```

Load `dist/` via `chrome://extensions` → Developer mode → "Load unpacked", and hit
the reload icon on the extension card after each rebuild. You'll need a Jira Cloud
site to test against (a free one from https://www.atlassian.com/try works).

The license backend lives in `worker/` (Cloudflare Worker); see `worker/README.md`.
You don't need it for extension development — without it the extension simply runs
in trial/free mode.

## Code style

- TypeScript + Preact, no additional runtime dependencies without discussion.
- Match the existing style; keep components small; UI text in English.
- `npm run build` must pass (it typechecks) before a PR.

## Reporting bugs

Use the bug report template. Screenshots help; never include your Jira API token
or your site's data in an issue.

## Security issues

Please do NOT open a public issue — see [SECURITY.md](SECURITY.md).

## Licensing of contributions

The project is licensed under AGPL-3.0. By submitting a contribution you agree it
will be distributed under the same license.
