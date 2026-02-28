# gdpr

## Description

GDPR compliance primitives: a data export endpoint that generates a JSON archive
of all personal data for a user, and a soft-delete account deletion flow that
anonymizes PII and schedules hard deletion after a 30-day grace period.

## Related Files

- `app/utils/gdpr.server.ts` — `exportUserData()` and `softDeleteUser()`.
- `app/emails/account-deletion.tsx` — deletion confirmation email template.
- `app/routes/resources.account.export-data/route.ts` — GET endpoint; returns
  all user data as a JSON download (`my-data.json`).
- `app/routes/_authenticated.settings.delete-account/route.tsx` — settings page
  with email-confirmation form; soft-deletes account and logs out user.
- `app/root.tsx` — renders the Plausible analytics script when `plausibleDomain`
  is set.
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

1. Delete `app/utils/gdpr.server.ts`.
2. Delete `app/emails/account-deletion.tsx`.
3. Delete `app/routes/resources.account.export-data/` and
   `app/routes/_authenticated.settings.delete-account/`.
4. Remove `scheduledForDeletionAt` from `app/db/schema.ts` and generate a new
   migration.
