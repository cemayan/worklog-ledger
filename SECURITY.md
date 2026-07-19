# Security Policy

## Reporting a vulnerability

Please report security issues privately to **support@cemayan.com** — do not open
a public issue. You'll get an acknowledgement within 48 hours and a status update
within 7 days. Please include steps to reproduce and the affected component.

## Scope

- The browser extension (`src/`, published on the Chrome Web Store)
- The license worker (`worker/`, worklog-ledger-license.cemayan.workers.dev)
- The product website (worklogledger.cemayan.com)

Out of scope: Jira Cloud itself (report to Atlassian), Paddle checkout (report to
Paddle), and issues requiring a compromised browser or machine.

## What counts

Especially interesting: any way the extension could leak Jira data or credentials
to a third party, bypasses of the webhook signature verification, and XSS on the
website. The extension's core promise is that user data never leaves the browser —
anything that breaks that promise is a critical finding.

## Supported versions

Only the latest published version of the extension is supported.
