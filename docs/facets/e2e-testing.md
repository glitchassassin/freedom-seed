# e2e-testing

## Description

End-to-end tests using Playwright. Tests run against **per-worker preview
builds** — not the dev server. Each Playwright worker gets its own isolated
`vite preview` server to eliminate SQLite lock contention. Every test page is
checked for accessibility violations via `axe-core`. Tests live in `tests/`.

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
- `tests/worker-server.ts` — Per-worker server lifecycle (start/stop/cleanup)
- `tests/playwright-utils.ts` — Shared fixtures including `workerServer`
- `tests/mocks/resend-server.ts` — Mock Resend HTTP server
- `tests/email-helpers.ts` — Email capture test utilities
- `tests/global-setup.ts` — Builds app, applies migrations, starts mock server
- `tests/global-teardown.ts` — Stops mock server and cleans up
- `.dev.vars.test` — Test env overrides (sets `RESEND_API_KEY`)

## Per-Worker Isolation

Each Playwright worker runs its own `vite preview` instance to avoid SQLite lock
contention when tests run in parallel.

### Architecture

1. **Global setup** (`tests/global-setup.ts`) runs `npm run build` with
   `RESEND_BASE_URL` baked in, then applies D1 migrations to create a baseline
   `.wrangler/state/` directory.
2. **Worker fixture** (`workerServer` in `tests/playwright-utils.ts`)
   deep-copies the baseline `.wrangler/state/` into an isolated directory for
   each worker, then starts a `vite preview` server on port
   `4200 + workerInfo.parallelIndex`.
3. **`tests/worker-server.ts`** encapsulates the per-worker server lifecycle:
   copying state, spawning the preview process, and cleaning up on teardown.
4. **`tests/factories/db.ts`** exposes `setWorkerRoot()` so factory helpers
   point at the correct isolated database for the current worker.

There is no `webServer` entry in `playwright.config.ts`; servers are managed
entirely through the `workerServer` fixture.

## Email Capture

E2E tests can capture emails sent by the app without mocking application code. A
mock Resend server runs on `localhost:3001` during tests and records every email
to a temp file.

### How it works

1. `tests/global-setup.ts` starts the mock Resend server, then runs
   `npm run build` with `RESEND_BASE_URL=http://localhost:3001` baked into the
   build output, then applies D1 migrations to create the baseline
   `.wrangler/state/`.
2. `RESEND_BASE_URL` is embedded at build time — it is not passed via a
   `webServer` command at runtime.
3. `.dev.vars.test` sets `RESEND_API_KEY=re_test_mock` (overriding the empty
   value from `.dev.vars`) so the app uses the SDK instead of console.log.
4. `tests/global-teardown.ts` stops the mock server and cleans up.

### Helpers (`tests/email-helpers.ts`)

| Function                         | Description                                               |
| -------------------------------- | --------------------------------------------------------- |
| `waitForEmail(recipient, opts?)` | Polls for a captured email (default 5 s timeout, 100 ms). |
| `readEmail(recipient)`           | Returns the latest captured email or `null`.              |

### Example

```ts
import { waitForEmail } from './email-helpers'

test('signup sends verification email', async ({ page }) => {
	const email = uniqueEmail()
	await signUp(page, { email })
	const captured = await waitForEmail(email)
	expect(captured.subject).toContain('Verify')
	// Extract token URL from captured.html and navigate to it
})
```

No `beforeEach` cleanup is needed — `uniqueEmail()` and per-recipient filtering
prevent cross-test interference.

## Removal

Delete `tests/`, `playwright.config.ts`, and remove `@axe-core/playwright` and
`@playwright/test` from `package.json`.
