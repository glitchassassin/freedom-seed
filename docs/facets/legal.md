# legal

## Description

Stub Privacy Policy and Terms of Service pages rendered as static routes.
Content is maintained as plain markdown in `content/legal/` and rendered via a
shared layout. Links to both pages appear in the footer and during signup. Page
content must be customized per-product before launch — the stubs contain section
headings and placeholder text only.

## Related Files

- `app/routes/_legal/_layout.tsx` — Shared layout for legal pages with
  back-to-home link, centered prose container, and footer.
- `app/routes/_legal.privacy/route.tsx` — Privacy Policy page (stub content).
- `app/routes/_legal.terms/route.tsx` — Terms of Service page (stub content).
- `content/legal/privacy-policy.md` — Reference markdown for privacy policy.
- `content/legal/terms-of-service.md` — Reference markdown for terms of service.
- `app/routes/_index/content.ts` — Footer links array includes `/privacy` and
  `/terms`.
- `app/routes/_auth.signup/route.tsx` — Consent notice linking to both legal
  pages.

## Removal

1. Delete `app/routes/_legal/`, `app/routes/_legal.privacy/`,
   `app/routes/_legal.terms/`, and `content/legal/`.
2. Remove the legal consent paragraph from `app/routes/_auth.signup/route.tsx`.
3. Remove the Privacy/Terms links from `app/routes/_index/content.ts` footer.
