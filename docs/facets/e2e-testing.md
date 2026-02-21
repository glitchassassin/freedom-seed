# e2e-testing

## Description

End-to-end tests using Playwright. Tests run against the **preview build**
(`npm run preview`, port 4173) — not the dev server. Every test page is checked
for accessibility violations via `axe-core`. Tests live in `tests/`.

## Commands

```bash
npm run test:e2e              # Run all E2E tests
npm run test:e2e:ui           # Run with Playwright UI
npx playwright test tests/home.spec.ts        # Single file
npx playwright test -g "test name pattern"    # Pattern match
```

## Related Files

- `tests/` — Playwright test files
- `playwright.config.ts` — Playwright configuration

## Removal

Delete `tests/`, `playwright.config.ts`, and remove `@axe-core/playwright` and
`@playwright/test` from `package.json`.
