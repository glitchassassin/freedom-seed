# gdpr

## Description

GDPR compliance primitives: a data export endpoint that generates a JSON archive
of all personal data for a user, a soft-delete account deletion flow that
anonymizes PII and schedules hard deletion after a 30-day grace period, and a
cookie consent banner shown to all visitors. Consent choices are stored in a
cookie; analytics scripts are conditionally loaded based on consent state.

## Related Files

- `app/utils/consent.server.ts` — reads and builds the `en_consent` cookie.
- `app/utils/gdpr.server.ts` — `exportUserData()` and `softDeleteUser()`.
- `app/emails/account-deletion.tsx` — deletion confirmation email template.
- `app/components/cookie-consent-banner.tsx` — sticky banner shown when consent
  is `null`; submits to the consent resource route.
- `app/routes/resources.consent-cookie/route.tsx` — POST action that sets the
  `en_consent` cookie and redirects back to the originating page.
- `app/routes/resources.account.export-data/route.ts` — GET endpoint; returns
  all user data as a JSON download (`my-data.json`).
- `app/routes/_authenticated.settings.delete-account/route.tsx` — settings page
  with email-confirmation form; soft-deletes account and logs out user.
- `app/root.tsx` — reads consent in the loader; gates the analytics script on
  `consentState === 'granted'`; renders `<CookieConsentBanner>` when `null`.
- `app/db/schema.ts` — `users.scheduledForDeletionAt` column (set 30 days out on
  soft-delete).
- `migrations/0008_cultured_changeling.sql` — adds `scheduled_for_deletion_at`.

## Soft-delete grace period

`softDeleteUser()` anonymises PII immediately and sets `scheduledForDeletionAt`
to 30 days from now. Hard deletion (removing the DB row) must be performed by a
scheduled Cloudflare Worker cron that queries
`WHERE scheduled_for_deletion_at <= unixepoch('now') * 1000`.

### Audit log email retention (GDPR Article 17)

`softDeleteUser()` does not anonymise `actorEmail` in the `audit_log` table.
Audit log entries therefore retain the original email address until the
hard-delete cron removes the associated workspace rows (which cascade-deletes
the audit log). This is intentional: audit trails must remain intact for legal
compliance and fraud investigation purposes during the 30-day grace period. Once
the hard-delete cron runs, all audit log rows for the user's workspaces are
permanently removed along with all other personal data.

## Removal

1. Delete `app/utils/consent.server.ts` and `app/utils/gdpr.server.ts`.
2. Delete `app/emails/account-deletion.tsx`.
3. Delete `app/components/cookie-consent-banner.tsx`.
4. Delete `app/routes/resources.consent-cookie/`,
   `app/routes/resources.account.export-data/`, and
   `app/routes/_authenticated.settings.delete-account/`.
5. Remove the `getConsentState` import and call from `app/root.tsx`; revert the
   analytics script to render unconditionally on `plausibleDomain`; remove the
   `<CookieConsentBanner>` render.
6. Remove `scheduledForDeletionAt` from `app/db/schema.ts` and generate a new
   migration.
