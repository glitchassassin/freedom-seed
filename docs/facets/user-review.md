# User Review

Per-PR Playwright HTML report previews on GitHub Pages with embedded trace
viewer.

## Description

When a pull request runs Playwright E2E tests, the CI workflow publishes the
HTML report (including the embedded trace viewer) to GitHub Pages. A bot comment
is posted on the PR with a direct link to the report. When the PR is closed or
merged, the report is automatically cleaned up.

## How it works

1. The `playwright` job runs tests and uploads `playwright-report/` as an
   artifact (existing behavior)
2. The `publish-report` job downloads the artifact and uses
   `rossjrw/pr-preview-action@v1` to push it to the `gh-pages` branch under
   `pr-preview/pr-<N>/`
3. The action posts a sticky PR comment with the preview URL
4. The embedded trace viewer works same-origin on GitHub Pages — no CORS issues,
   works for private repos too
5. On PR close, the `cleanup-report` job removes the preview directory from
   `gh-pages`

## Related Files

- `.github/workflows/ci.yml` — `publish-report` and `cleanup-report` jobs
- `playwright.config.ts` — Trace and reporter settings

## One-time setup

See `docs/operations/setup.md` for GitHub Pages configuration:

- Enable GitHub Pages to deploy from the `gh-pages` branch
- Grant workflow read-and-write permissions

## Removal

1. Delete the `publish-report` and `cleanup-report` jobs from
   `.github/workflows/ci.yml`
2. Remove the `closed` type from the `pull_request` trigger (if no other job
   needs it)
3. Disable GitHub Pages in repository settings
4. Delete this file and its entry in `docs/facets/README.md`
