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
- [x] Edit and delete existing worklogs (PUT/DELETE on the worklog endpoints)
- [x] Copy last week / duplicate an entry onto another day (shared WorklogDialog,
      duplicates staged as drafts)
- [x] API-token fallback UI: settings panel (site, session/token auth, email + token),
      "Open settings" CTA on auth errors incl. token expiry
- [x] Loading skeleton, empty-week hint, per-day target progress bar (configurable
      daily target, weekdays only)
- [x] Basic keyboard navigation on the grid (←/→ between days with week wrap,
      Enter = log work)

## Week 1 — remaining (free tier)

- (done — see above)

## Week 2 — paid tier + release

- [x] Report engine: date-range, entry-level aggregation grouped by client/project/person
      (epic grouping deferred; parentKey already fetched)
- [x] Client mapping (project → client) + hourly rates + billable flag (stored in
      `chrome.storage.sync`), default rate + currency
- [x] Invoice-ready CSV export (hours × rate, entry-level, totals row, Excel-friendly
      BOM/CRLF) — dedicated Excel .xlsx deferred
- [x] ExtensionPay integration (code side) — `extpay` wired in `lib/license.ts` with
      lazy import + cached-paid fallback, background worker, Upgrade buttons; reverse
      trial 14 days full → export/rates lock
- [x] Icons (16/48/128, generated from SVG), CWS listing draft (`store/listing.md`),
      privacy policy + landing page (`site/`, ready for GitHub Pages)
- [x] Payment provider decided: Paddle (merchant of record — works from Turkey,
      wire payouts, no Stripe/PayPal needed). ExtensionPay/extpay removed; licensing
      is now email-activation against a Cloudflare Worker (`worker/`) fed by Paddle
      webhooks. Trial logic unchanged.
- [x] Paddle live wired: product pro_01kxxsjbrk7nz29h514ae4d3nb, price
      pri_01kxxsjc7t1yjgjzdq25ms4wg4 ($7/mo), webhook ntfset_01kxxsss6v9m43bmnr773mpeae.
      Worker deployed at https://worklog-ledger-license.cemayan.workers.dev with
      KV + both secrets; LICENSE_API already points there.
- [ ] Paddle: finish seller verification (KYC + website approval) — checkout won't
      charge until Paddle approves the account
- [ ] Paste the client-side token (Developer tools > Authentication > Client-side
      tokens) into site/index.html PADDLE_CLIENT_TOKEN to enable the buy button
- [ ] Rotate the Paddle API key and the account password after setup (both were
      shared in chat)
- [x] Publish site/ to GitHub Pages (gh-pages branch) — live at
      https://cemayan.com/worklog-ledger/ (privacy: /worklog-ledger/privacy.html)
- [x] Support email: support@cemayan.com (iCloud+ alias), on site + listing
- [x] Screenshots 1280×800 (calendar light/dark, report light/dark)
- [x] SUBMITTED to Chrome Web Store for review — 2026-07-19, v0.1.0, developer
      account under the new product Gmail; Search Console domain verified.
      Review may take days to 3+ weeks.

## While waiting for review (launch prep)

- [ ] ON CWS APPROVAL: swap the landing hero CTA (site/index.html, TODO comment)
      to the real store URL and republish gh-pages

- [ ] Distribution hit list: unanswered "worklog report/export" questions on
      Atlassian Community; complaint threads in Jira Assistant GitHub issues
      (#426 silent upload, Tempo gap 2026-07-02, keyboard UX 2026-02) — draft
      helpful replies to post once the store link exists
- [ ] "Tempo alternative for agencies" comparison post (SEO) for the landing site
- [ ] Real-money checkout smoke test with a 100% discount code once live
- [ ] Wire Paddle customer portal link (cancel/manage) into site footer or FAQ

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
