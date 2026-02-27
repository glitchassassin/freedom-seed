# seo

## Description

Search engine visibility infrastructure: a `<Meta>` helper that routes export to
override page title, description, and Open Graph tags; an auto-generated XML
sitemap at `/sitemap.xml`; and a `robots.txt` route. Canonical URLs are set
consistently, and structured data (JSON-LD) stubs are provided for landing and
blog pages.

## Related Files

- `app/utils/seo.ts` — `seoMeta()` helper that generates title, description, OG,
  Twitter, and canonical meta tags from a single config object.
- `app/utils/structured-data.ts` — `jsonLd()`, `websiteJsonLd()`, and
  `webPageJsonLd()` helpers for injecting JSON-LD structured data via meta.
- `app/routes/robots[.]txt.ts` — Resource route serving `/robots.txt` with
  allow-all policy and sitemap reference.
- `app/routes/sitemap[.]xml.ts` — Resource route generating `/sitemap.xml` with
  all public static pages.

## Removal

1. Delete the four files listed above.
2. Remove any `seoMeta()` or `jsonLd()` calls from route `meta` exports.
