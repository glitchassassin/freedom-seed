# email-templates

## Description

Typed, component-based email templates built with React Email. Each system email
(welcome, verify address, reset password, team invitation) lives as a `.tsx`
file that renders to HTML and plain-text. Templates share a common layout
component for consistent styling.

## Related Files

- `app/emails/components.tsx` — Shared `EmailLayout` wrapper and style tokens.
- `app/emails/welcome.tsx` — Welcome email after sign-up.
- `app/emails/verify-email.tsx` — Email address verification with CTA button.
- `app/emails/reset-password.tsx` — Password reset link with 1-hour expiry.
- `app/emails/team-invitation.tsx` — Team invitation with accept button.

## Dependencies

- `@react-email/components` — Headless email UI components.
- `@react-email/render` — Renders templates to HTML and plain text.

## Removal

1. Delete the `app/emails/` directory.
2. Remove call sites that import templates from `~/emails/*`.
3. Run `npm uninstall @react-email/components @react-email/render` (keep
   `resend` if the email facet is still in use).
