# auth-mfa

## Description

Optional TOTP-based multi-factor authentication using an authenticator app
(Google Authenticator, Authy, 1Password, etc.). Users enroll by scanning a QR
code and confirming a 6-digit code. On login, a second step challenges for the
current TOTP or a one-time backup code.

## Related Files

### Schema

- `app/db/schema.ts` — `mfaCredentials` and `mfaBackupCodes` tables
- `migrations/0001_round_boomerang.sql` — migration for new auth tables

### Server Utilities

- `app/utils/mfa.server.ts` — TOTP generation/verification, backup code
  generation/verification, MFA pending cookie management

### Routes

- `app/routes/_authenticated.settings.mfa/route.tsx` — MFA setup/disable
  settings page (enable, verify, show backup codes, disable with password)
- `app/routes/_auth.login.mfa/route.tsx` — MFA challenge during login (TOTP or
  backup code)

### Modified Files

- `app/routes/_auth.login/route.tsx` — checks for MFA after password
  verification; redirects to `/login/mfa` with a signed pending cookie instead
  of creating a session

### Dependencies

- `otpauth` — TOTP generation and validation
- `qrcode` / `@types/qrcode` — QR code data URL generation for enrollment

## Removal

1. Delete `app/routes/_auth.login.mfa/` and
   `app/routes/_authenticated.settings.mfa/`
2. Delete `app/utils/mfa.server.ts`
3. Remove `mfaCredentials` and `mfaBackupCodes` from `app/db/schema.ts`
4. Revert the MFA check in `app/routes/_auth.login/route.tsx` (remove the
   `mfaCredentials` import, the MFA query, and the pending-cookie redirect;
   restore direct session creation after password verification)
5. Run `npx drizzle-kit generate` to create a migration dropping the tables
6. Uninstall `otpauth`, `qrcode`, `@types/qrcode`
