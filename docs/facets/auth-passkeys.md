# auth-passkeys

## Description

Passwordless authentication using the WebAuthn / Passkey standard. Users
register a device-bound credential (Face ID, Touch ID, Windows Hello, hardware
key) and authenticate without a password. Supports multiple passkeys per account
with friendly naming, and discoverable credentials for passwordless login.

## Related Files

### Schema

- `app/db/schema.ts` — `passkeyCredentials` table (credentialId, publicKey,
  counter, deviceType, backedUp, transports, name, lastUsedAt)
- `migrations/0004_perpetual_winter_soldier.sql` — migration for the
  `passkey_credentials` table

### Server Utilities

- `app/utils/passkeys.server.ts` — WebAuthn registration/authentication helpers,
  challenge cookie management, passkey CRUD operations

### Routes

- `app/routes/_authenticated.settings.passkeys/route.tsx` — passkey management
  settings page (register, rename, delete passkeys)
- `app/routes/resources.passkeys.registration-options/route.tsx` — POST endpoint
  returning WebAuthn registration options (requires auth)
- `app/routes/resources.passkeys.registration-verify/route.tsx` — POST endpoint
  to verify and save registration response (requires auth)
- `app/routes/resources.passkeys.authentication-options/route.tsx` — POST
  endpoint returning WebAuthn authentication options (no auth required)
- `app/routes/resources.passkeys.authentication-verify/route.tsx` — POST
  endpoint to verify authentication response and create session

### Modified Files

- `app/routes/_auth.login/route.tsx` — adds "Sign in with passkey" button that
  triggers client-side WebAuthn authentication flow
- `workers/env.ts` — adds `RP_ID`, `RP_NAME`, `RP_ORIGIN` env vars for WebAuthn
  relying party configuration
- `wrangler.jsonc` — adds default values for WebAuthn env vars

### Dependencies

- `@simplewebauthn/server` — server-side WebAuthn registration and
  authentication verification
- `@simplewebauthn/browser` — client-side WebAuthn API wrapper (dynamically
  imported)

## Removal

1. Delete `app/routes/_authenticated.settings.passkeys/` and all
   `app/routes/resources.passkeys.*/` route directories
2. Delete `app/utils/passkeys.server.ts`
3. Remove `passkeyCredentials` from `app/db/schema.ts`
4. Remove the passkey login button from `app/routes/_auth.login/route.tsx`
5. Remove `RP_ID`, `RP_NAME`, `RP_ORIGIN` from `workers/env.ts` and
   `wrangler.jsonc`
6. Run `npx drizzle-kit generate` to create a migration dropping the table
7. Uninstall `@simplewebauthn/server`, `@simplewebauthn/browser`
