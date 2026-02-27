# auth-social

## Description

OAuth 2.0 / OIDC login via third-party identity providers (Google, GitHub). On
first login, creates a linked identity record and a personal workspace. If the
provider returns a verified email that matches an existing account, the social
identity is automatically linked to that account. Users can connect and
disconnect social accounts from the settings page.

## Related Files

### Schema

- `app/db/schema.ts` — `socialIdentities` table (provider, providerUserId,
  email, displayName, avatarUrl), `socialProviderEnum`, and `SocialProvider`
  type
- `migrations/0005_white_rawhide_kid.sql` — migration for the
  `social_identities` table

### Server Utilities

- `app/utils/social-auth.server.ts` — OAuth provider initialization (Google with
  PKCE, GitHub), state cookie management, profile fetching, user
  lookup/creation, account linking/unlinking

### Routes

- `app/routes/social.$provider/route.tsx` — `/social/:provider` OAuth initiation
  (loader redirects to provider; works for both login and account linking modes)
- `app/routes/social.$provider.callback/route.tsx` —
  `/social/:provider/callback` OAuth callback handler (exchanges code for
  tokens, fetches profile, creates/links user, creates session)
- `app/routes/_authenticated.settings.connected-accounts/route.tsx` —
  `/settings/connected-accounts` settings page for managing connected social
  accounts (connect new, disconnect existing)

### Modified Files

- `app/routes/_auth.login/route.tsx` — adds "Continue with Google" and "Continue
  with GitHub" buttons below the existing auth options
- `app/routes/_auth.signup/route.tsx` — adds the same social signup buttons
  above the "Already have an account?" link
- `workers/env.ts` — adds `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
  `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` env vars
- `wrangler.jsonc` — adds default (empty) values for OAuth env vars

### Dependencies

- `arctic` — edge-compatible OAuth 2.0 library for Google and GitHub

## Design Decisions

- Social login bypasses MFA — the provider's authentication is treated as
  equivalent to a second factor. A TODO comment in the callback route documents
  this decision.
- Social routes live outside both `_auth` and `_authenticated` layouts so they
  are accessible in both login and account-linking contexts.
- Google uses PKCE (code verifier stored in the state cookie); GitHub does not
  require it.

## Removal

1. Delete `app/routes/social.$provider/`,
   `app/routes/social.$provider.callback/`, and
   `app/routes/_authenticated.settings.connected-accounts/`
2. Delete `app/utils/social-auth.server.ts`
3. Remove `socialIdentities`, `socialProviderEnum`, and `SocialProvider` from
   `app/db/schema.ts`
4. Remove social login buttons from `app/routes/_auth.login/route.tsx` and
   `app/routes/_auth.signup/route.tsx`
5. Remove `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`,
   `GITHUB_CLIENT_SECRET` from `workers/env.ts` and `wrangler.jsonc`
6. Run `npx drizzle-kit generate` to create a migration dropping the table
7. Uninstall `arctic`
