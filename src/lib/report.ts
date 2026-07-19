import { searchWorklogIssuesInRange, issueWorklogs, adfToText } from './jira';
import { isoDate } from './week';

/** One worklog flattened with its issue context — the report's atomic row. */
export interface ReportEntry {
  date: string; // yyyy-MM-dd
  started: string;
  issueKey: string;
  issueSummary: string;
  projectKey: string;
  projectName: string;
  authorId: string;
  authorName: string;
  seconds: number;
  comment: string;
}

/** All worklogs (every author) started within [from, to], sorted by start time. */
export async function fetchReportEntries(from: string, to: string): Promise<ReportEntry[]> {
  const afterMs = new Date(`${from}T00:00:00`).getTime();
  const beforeMs = new Date(`${to}T00:00:00`).getTime() + 24 * 3600 * 1000;

  const issues = await searchWorklogIssuesInRange(from, to);
  const results = await Promise.all(
    issues.map(async (issue) => ({
      issue,
      worklogs: await issueWorklogs(issue.key, afterMs, beforeMs),
    })),
  );

  const entries: ReportEntry[] = [];
  for (const { issue, worklogs } of results) {
    for (const w of worklogs) {
      entries.push({
        date: isoDate(new Date(w.started)),
        started: w.started,
        issueKey: issue.key,
        issueSummary: issue.summary,
        projectKey: issue.projectKey,
        projectName: issue.projectName,
        authorId: w.author.accountId,
        authorName: w.author.displayName,
        seconds: w.timeSpentSeconds,
        comment: adfToText(w.comment).trim(),
      });
    }
  }
  entries.sort((a, b) => a.started.localeCompare(b.started));
  return entries;
}
