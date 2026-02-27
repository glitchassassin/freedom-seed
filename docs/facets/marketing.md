# marketing

## Description

Landing page layout and section components: hero, feature grid, social proof /
testimonials, pricing table, FAQ accordion, and CTA banner. Sections are
composed on the home route and designed to be independently removed or
reordered. Copy and imagery are extracted into a single `content.ts` file to
simplify customization without touching component code.

## Related Files

- `app/routes/_index/route.tsx` — Home page composed from section components:
  `HeroSection`, `FeaturesSection`, `FaqSection`, `CtaSection`, `Footer`.
- `app/routes/_index/content.ts` — All marketing copy (site config, hero,
  features, FAQ, CTA, footer) extracted into a single editable file.

## Removal

1. Delete `app/routes/_index/` directory.
2. Create a minimal `app/routes/index.tsx` with your own landing page or
   redirect.
