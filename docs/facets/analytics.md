# analytics

## Description

Privacy-friendly page view analytics via Plausible. The tracking script is
loaded only when `PLAUSIBLE_DOMAIN` is set, so local development and unset
deployments produce no tracking. Self-hosted Plausible CE is supported via
`PLAUSIBLE_HOST`.

React 19 hoists the `<script>` to `<head>` automatically. The script is rendered
in the root `App` component (not `Layout`), so it does not load on error pages.

For in-app product analytics (funnels, session replay, feature flags), PostHog
can be added separately behind authentication.

## Configuration

Set these vars in `wrangler.jsonc` (or via the Cloudflare dashboard for
production secrets), then run `npm run cf-typegen` to update types:

| Variable           | Required | Description                                                                      |
| ------------------ | -------- | -------------------------------------------------------------------------------- |
| `PLAUSIBLE_DOMAIN` | Yes      | Your site's domain as registered in Plausible, e.g. `example.com`                |
| `PLAUSIBLE_HOST`   | No       | Base URL of a self-hosted Plausible instance. Defaults to `https://plausible.io` |

**Cloud Plausible** — register your site at [plausible.io](https://plausible.io)
and set `PLAUSIBLE_DOMAIN` only.

**Self-hosted Plausible CE** — Plausible Community Edition is free, open-source
(AGPL-3.0), and supports unlimited sites from a single instance (no per-site
cost). A single instance on a ~$6/mo Hetzner VPS covers multiple apps. Set both
`PLAUSIBLE_DOMAIN` and `PLAUSIBLE_HOST`.

## Related Files

- `app/root.tsx` — loader reads env vars; `App` conditionally renders the script
- `wrangler.jsonc` — `PLAUSIBLE_DOMAIN` and `PLAUSIBLE_HOST` vars (empty by
  default)
- `worker-configuration.d.ts` — auto-generated `Env` types (regenerate with
  `npm run cf-typegen`)

## Removal

1. Remove the `loader` export from `app/root.tsx`
2. Remove the `loaderData` destructuring from the `App` component props and the
   `<script>` block
3. Remove `PLAUSIBLE_DOMAIN` and `PLAUSIBLE_HOST` from `wrangler.jsonc`
4. Run `npm run cf-typegen`
