# legal

## Description

Stub Privacy Policy and Terms of Service pages rendered as static routes.
Content is authored as plain markdown in `content/legal/` and compiled to React
components at build time via `@mdx-js/rollup`. A shared layout wraps the
content, and element-level styling is applied through `legalComponents` in
`app/components/legal-prose.tsx`. Links to both pages appear in the footer and
during signup. Page content must be customized per-product before launch — the
stubs contain section headings and placeholder text only.

## Related Files

- `content/legal/privacy-policy.md` — Privacy policy content (edit this file).
- `content/legal/terms-of-service.md` — Terms of service content (edit this
  file).
- `app/components/legal-prose.tsx` — MDX component mapping that styles rendered
  markdown elements to match the design system.
- `app/routes/_legal/_layout.tsx` — Shared layout for legal pages with
  back-to-home link, centered prose container, and footer.
- `app/routes/_legal.privacy/route.tsx` — Privacy Policy route (imports markdown
  content).
- `app/routes/_legal.terms/route.tsx` — Terms of Service route (imports markdown
  content).
- `app/routes/_index/content.ts` — Footer links array includes `/privacy` and
  `/terms`.
- `app/routes/_auth.signup/route.tsx` — Consent notice linking to both legal
  pages.
- `app/types/mdx.d.ts` — TypeScript declarations for `.md` module imports.

## Removal

1. Delete `app/routes/_legal/`, `app/routes/_legal.privacy/`,
   `app/routes/_legal.terms/`, `content/legal/`,
   `app/components/legal-prose.tsx`, and `app/types/mdx.d.ts`.
2. Remove the legal consent paragraph from `app/routes/_auth.signup/route.tsx`.
3. Remove the Privacy/Terms links from `app/routes/_index/content.ts` footer.
4. Remove `@mdx-js/rollup` and `@types/mdx` from `package.json` and the `mdx()`
   plugin from `vite.config.ts` (if no other MDX consumers remain).
5. Remove `"content/*"` path alias from `tsconfig.cloudflare.json` (if unused).
