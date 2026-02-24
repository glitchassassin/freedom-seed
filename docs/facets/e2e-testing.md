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

## Email Capture

E2E tests can capture emails sent by the app without mocking application code. A
mock Resend server runs on `localhost:3001` during tests and records every email
to a temp file.

### How it works

1. `tests/global-setup.ts` starts the mock server before all tests.
2. `playwright.config.ts` passes `RESEND_BASE_URL=http://localhost:3001` to the
   preview build, redirecting the Resend SDK.
3. `.dev.vars.test` sets `RESEND_API_KEY=re_test_mock` (overriding the empty
   value from `.dev.vars`) so the app uses the SDK instead of console.log.
4. `tests/global-teardown.ts` stops the server and cleans up.

### Helpers (`tests/email-helpers.ts`)

| Function                         | Description                                               |
| -------------------------------- | --------------------------------------------------------- |
| `waitForEmail(recipient, opts?)` | Polls for a captured email (default 5 s timeout, 100 ms). |
| `readEmail(recipient)`           | Returns the latest captured email or `null`.              |
| `clearCapturedEmails()`          | Truncates the capture file (call in `beforeEach`).        |

### Example

```ts
import { clearCapturedEmails, waitForEmail } from './email-helpers'

test.beforeEach(() => {
	clearCapturedEmails()
})

test('signup sends verification email', async ({ page }) => {
	const email = uniqueEmail()
	await signUp(page, { email })
	const captured = await waitForEmail(email)
	expect(captured.subject).toContain('Verify')
	// Extract token URL from captured.html and navigate to it
})
```

### Related Files

- `tests/mocks/resend-server.ts` — Mock Resend HTTP server
- `tests/email-helpers.ts` — Email capture test utilities
- `tests/global-setup.ts` — Starts mock server
- `tests/global-teardown.ts` — Stops mock server and cleans up
- `.dev.vars.test` — Test env overrides (sets `RESEND_API_KEY`)

## Removal

Delete `tests/`, `playwright.config.ts`, and remove `@axe-core/playwright` and
`@playwright/test` from `package.json`.
