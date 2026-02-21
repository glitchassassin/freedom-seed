# Facets

Facets are modular feature areas of the boilerplate. Each facet has a dedicated
doc describing what it is, which files implement it, and how to remove it if
your app doesn't need it.

> **Lint rule:** facet files must stay under 100 lines. Keep descriptions tight
> — they are pulled into agent context windows.

## Auth & Identity

- [auth-sessions](./auth-sessions.md) — Cookie-based session lifecycle:
  creation, rotation, and revocation.
- [auth-password](./auth-password.md) — Username/email and password
  authentication with secure hashing.
- [auth-passkeys](./auth-passkeys.md) — Passwordless WebAuthn/passkey
  authentication.
- [auth-social](./auth-social.md) — OAuth login via third-party providers
  (Google, GitHub, Apple).
- [auth-magic-link](./auth-magic-link.md) — Email-based magic link and
  one-time-password login.
- [auth-mfa](./auth-mfa.md) — Optional TOTP-based multi-factor authentication
  via authenticator app.
- [auth-email-verification](./auth-email-verification.md) — Enforced email
  ownership verification before full account access.

## Authorization

- [rbac](./rbac.md) — Role-based access control scoped to team membership.

## Teams & Multi-tenancy

- [teams](./teams.md) — Account/team abstraction allowing users to belong to
  multiple workspaces.
- [invitations](./invitations.md) — Email-based invitation flow for adding
  members to a team.
- [audit-log](./audit-log.md) — Append-only log of significant actions taken
  within an account.

## Billing

- [billing](./billing.md) — Stripe integration for subscriptions, Checkout, and
  the Customer Portal.
- [billing-plans](./billing-plans.md) — Plan tiers, feature entitlements, and
  usage limit enforcement.

## Messaging

- [email](./email.md) — Transactional email delivery via Resend.
- [email-templates](./email-templates.md) — Typed React Email templates for all
  system-generated emails.
- [sms](./sms.md) — SMS messaging via Twilio for OTP verification and
  notifications.

## Marketing & SEO

- [seo](./seo.md) — Meta tags, Open Graph, sitemap, and robots.txt for search
  visibility.
- [marketing](./marketing.md) — Landing page section components: hero, features,
  pricing, FAQ.
- [blog](./blog.md) — MDX-based blog and changelog system for marketing pages.
- [analytics](./analytics.md) — Privacy-friendly page view and event tracking.

## Observability

- [observability](./observability.md) — Error tracking, structured logging,
  request IDs, and health check endpoint.

## Security

- [security-headers](./security-headers.md) — HTTP security headers (CSP, HSTS,
  X-Frame-Options, etc.) applied at the Worker layer.
- [rate-limiting](./rate-limiting.md) — Per-IP and per-user request throttling
  on sensitive endpoints.
- [csrf](./csrf.md) — CSRF token protection for cookie-authenticated form
  submissions.
- [bot-protection](./bot-protection.md) — Cloudflare Turnstile challenge on auth
  and high-risk public forms.

## UI & UX

- [ui-components](./ui-components.md) — shadcn/ui component library built on
  Radix UI and Tailwind.
- [ui-icons](./ui-icons.md) — SVG sprite icon system sourced from icones.js.org
  (Iconify).
- [dark-mode](./dark-mode.md) — SSR-safe cookie-based theme switching.
- [notifications](./notifications.md) — Flash cookie toast notification system
  for action feedback.

## Developer Experience

- [env-validation](./env-validation.md) — Zod-based validation of Worker
  bindings and environment variables at startup.
- [feature-flags](./feature-flags.md) — Database-backed feature flags for
  gradual rollout and per-account overrides.
- [test-factories](./test-factories.md) — Typed factory helpers and seed scripts
  for generating test data.
- [e2e-testing](./e2e-testing.md) — Playwright E2E tests with axe-core
  accessibility checks against the preview build.

## Infrastructure

- [timezones](./timezones.md) — SSR-safe timezone-aware date formatting via
  client-hints cookies and @date-fns/tz.
- [routing](./routing.md) — File-system routing via react-router-auto-routes:
  conventions, layouts, colocation, and best practices.
- [middleware](./middleware.md) — React Router v8 middleware: when to use it,
  the context API, and current middleware inventory.
- [database](./database.md) — Cloudflare D1 + Drizzle ORM: schema conventions,
  migration workflow, and server-only access patterns.
- [cloudflare-workers](./cloudflare-workers.md) — Runtime conventions, service
  selection guide, and binding management.

## Storage

- [file-storage](./file-storage.md) — Cloudflare R2 object storage for user file
  uploads with pre-signed URLs.

## Legal & Compliance

- [legal](./legal.md) — Stub privacy policy and terms of service pages to
  customize before launch.
- [gdpr](./gdpr.md) — GDPR compliance: data export, soft-delete account
  deletion, and cookie consent.
