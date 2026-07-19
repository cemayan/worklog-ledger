# Launch outreach — hit list & drafts

Rule of engagement: every post answers the person's actual question first; the
product is mentioned once, with an explicit "I built this" disclosure. Never
post the same text twice; adapt. Skip any thread where an alternative isn't
on-topic — spam kills the trust story that IS our positioning.

## Channel 1 — Atlassian Community (primary)

Real user questions to answer once the store link exists:

- https://community.atlassian.com/forums/Jira-questions/worklog-per-month-time-tracking/qaq-p/3173461
- https://community.atlassian.com/forums/Jira-questions/How-to-see-when-did-the-worklog-logged/qaq-p/3116324
- Ongoing: search "worklog export", "worklog report", "invoice worklogs",
  "timesheet export" weekly; answer new questions within a day (freshness wins
  accepted answers).

Template (adapt per question):

> Jira can't do this natively — JQL's `worklogDate` filters *issues*, it doesn't
> aggregate the individual worklog entries, so you can't get entry-level totals
> for a date range out of the box. Your options:
>
> 1. **Marketplace timesheet apps** (Tempo, Clockwork, Worklog360…) — powerful,
>    but they're site-wide installs: an admin has to approve them and pricing is
>    per Jira user, so you pay for everyone even if only one person runs reports.
> 2. **Jira's REST API** — `GET /rest/api/3/issue/{key}/worklog` returns the
>    entries; a script can aggregate them. Works, but you're maintaining a script.
> 3. **A browser extension** — runs with your own login, no admin approval.
>    Full disclosure, I built one: Worklog Ledger ([link]) — weekly worklog
>    calendar free, and it turns a date range into per-client/per-person totals
>    with CSV export. Data stays in your browser (it talks only to your own
>    Jira site; it's open source).
>
> If you only need this once, option 2 is fine; if it's a monthly invoicing
> ritual, 1 or 3.

## Channel 2 — r/jira launch post

Title: **I built a Chrome extension that turns Jira worklogs into client
billing reports — no Marketplace install, no admin approval**

> Agencies I've worked with all had the same monthly ritual: export worklogs,
> fight a spreadsheet, attach it to the invoice. Jira can't aggregate worklog
> *entries* for a date range natively, Tempo-class apps charge per Jira user
> site-wide and need procurement/admin sign-off.
>
> So I built Worklog Ledger: a Chrome extension that uses your existing Jira
> session. Free part: a fast weekly worklog calendar (add/edit/duplicate,
> copy last week, staged push with visible errors). Paid part ($7/mo, only for
> the person running reports): map projects to clients, set rates, export an
> invoice-ready CSV.
>
> Trust stuff, since an extension touching Jira deserves scrutiny: open source
> ([github link]), no backend — your worklogs never leave your browser, the only
> permission is `*.atlassian.net`. Would love feedback, especially from people
> doing agency billing out of Jira today.

Post on a weekday morning US time; answer every comment same-day.

## Channel 3 — Jira Assistant GitHub issues (use judgment)

These are the incumbent's open wounds; only comment where the THREAD OWNER is
stuck and alternatives are on-topic. Always disclose. Do NOT carpet-post.

| Issue | Pain | Angle |
|---|---|---|
| [#426](https://github.com/shridhar-tl/jira-assistant/issues/426) (Oct 2025, open) | Silent worklog upload failure | Our staged-push-with-visible-errors is built exactly for this |
| [#436](https://github.com/shridhar-tl/jira-assistant/issues/436) (Jun 2026) | Worklog disappears after upload | Same angle: nothing silent, per-entry errors |
| [#437](https://github.com/shridhar-tl/jira-assistant/issues/437) (Jul 2026) | Tempo worklogs invisible | We don't do Tempo yet either — engage only when we ship Tempo read (post-MVP roadmap item), then this thread is gold |
| [#433](https://github.com/shridhar-tl/jira-assistant/issues/433) (Feb 2026) | Esc/keyboard UX | Our keyboard-first grid; light-touch mention only if thread revives |

Draft (for #426/#436-type threads, adapt):

> Hit this exact problem (a 413 dying silently and losing the entries is
> brutal when the hours go on an invoice). If it helps anyone: I ended up
> building a small extension where uploads are staged locally first and every
> failed entry stays visible with the error until it's fixed or removed —
> nothing is lost silently. It's open source: [link]. (Disclosure: I'm the
> author.) Not trying to take anything away from Jira Assistant — it's been
> great for years — but for the silent-loss issue specifically this was my fix.

## Channel 4 — SEO (compounding)

- Comparison page shipped: /tempo-alternative-for-agencies.html — target
  queries: "tempo alternative", "jira worklog export csv", "invoice from jira
  worklogs", "jira billing report".
- Next posts (one per week after launch): "How to export Jira worklogs to
  Excel/CSV (3 ways)", "Jira time tracking for agencies: what Jira can and
  can't do natively".

## Timing

1. Store approval lands → smoke-test checkout with 100% coupon → flip landing
   CTA to the store link.
2. Same day: r/jira post + first two Community answers.
3. Week 1: 5+ Community answers, comparison page indexed (submit sitemap in
   Search Console).
4. Gate check (launch + 4 weeks): ≥ ~200 installs, report clicks. Track via CWS
   stats — no in-product analytics, per privacy promise.
