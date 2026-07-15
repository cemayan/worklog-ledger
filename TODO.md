# Roadmap

Working plan for the 2-week MVP. Check items off as they land.

## Done

- [x] Session-reuse auth PoC, validated against a live Jira Cloud site (`poc/`)
- [x] MV3 skeleton: Vite + TypeScript + Preact, popup + full-page app
- [x] Jira client: session auth primary, API-token fallback in the data layer, typed auth errors
- [x] Weekly calendar (read): my worklogs per day via `search/jql` + per-issue worklog API
- [x] Write flow: "+ Log work" dialog (issue autocomplete, duration parser, start time,
      comment), staged drafts in `chrome.storage.local`, push bar with per-entry
      visible error handling

## Week 1 — remaining (free tier)

- [ ] Edit and delete existing worklogs (PUT/DELETE on the worklog endpoints)
- [ ] Copy last week / duplicate an entry onto another day
- [ ] API-token fallback UI: settings panel (email + token), auto-offered when the
      session check fails; handle token expiry (401 → prompt to re-enter)
- [ ] Loading/empty states polish; total-per-day target indicator (e.g. 8h)
- [ ] Basic keyboard navigation on the grid (arrows between days, Enter = log work)

## Week 2 — paid tier + release

- [ ] Report engine: date-range, entry-level aggregation grouped by client/project/epic/user
- [ ] Client mapping (project → client) + hourly rates + billable flag (stored in
      `chrome.storage.sync`)
- [ ] Invoice-ready CSV/Excel export (hours × rate, audit-friendly layout)
- [ ] ExtensionPay integration — free: calendar + report preview; paid: export + rates;
      14-day reverse trial
- [ ] Icons, Chrome Web Store listing (screenshots, description), static privacy policy
      + landing page (GitHub Pages)
- [ ] Submit to CWS early (manual review can take 3+ weeks)

## Later (post-MVP, sales-driven)

- [ ] Tempo interop: read worklogs from the Tempo API (top unanswered gap in the
      incumbent free extension)
- [ ] PDF export; QuickBooks/Xero-friendly CSV formats
- [ ] Timer (only if users ask — calendar-first is the positioning)
- [ ] Jira Data Center support

## Validation gates

- Gate 1 (done): session-reuse auth works → architecture confirmed
- Gate 2 (launch + 4 weeks): ≥ ~200 organic installs and report-feature clicks;
  otherwise invest in channels (Atlassian Community, r/jira)
- Gate 3 (launch + 8 weeks): first 5 paying users; otherwise change pricing/packaging
  or pivot to the release-notes idea on the same Jira REST base
