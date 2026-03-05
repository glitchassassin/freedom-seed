# billing

## Description

Stripe integration for subscription billing. Covers Checkout (new
subscriptions), the Customer Portal (plan changes, payment method updates,
cancellation), and inbound webhook handling for lifecycle events (payment
succeeded/failed, subscription updated/cancelled). A `stripeCustomerId` is
stored per workspace and synced on the first billing action.

## Related Files

- `app/db/schema.ts` — `subscriptions` table, `workspaces.stripeCustomerId`
- `app/utils/billing/stripe.server.ts` — Stripe SDK factory
- `app/utils/billing/billing.server.ts` — core billing logic (customer sync,
  subscription queries, plan lookups)
- `app/utils/billing/subscription-context.ts` — React Router context for current
  workspace plan
- `app/utils/billing/require-plan.server.ts` — plan gating helper
- `app/routes/resources.billing.checkout/route.tsx` — Stripe Checkout session
  creation
- `app/routes/resources.billing.portal/route.tsx` — Stripe Customer Portal
  session creation
- `app/routes/api.stripe-webhook/route.tsx` — Stripe webhook handler
- `app/routes/workspaces.$workspaceId/settings.billing/route.tsx` — billing
  settings UI
- `app/emails/payment-failed.tsx` — payment failure notification email
- `app/emails/subscription-confirmed.tsx` — subscription confirmation email
- `workers/env.ts` — `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `workers/app.ts` — CSP rules for Stripe domains

## Removal

1. Delete all files listed above (except `app/db/schema.ts`, `workers/env.ts`,
   `workers/app.ts`)
2. Remove `subscriptions` table and `workspaces.stripeCustomerId` from
   `app/db/schema.ts`
3. Remove `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` from `workers/env.ts`
   and `wrangler.jsonc`
4. Remove Stripe domains from CSP in `workers/app.ts`
5. Remove `subscriptionContext` middleware from
   `app/routes/workspaces.$workspaceId/_layout.tsx`
6. Remove "Billing" nav link from
   `app/routes/workspaces.$workspaceId/_layout.tsx`
7. Remove pricing section from `app/routes/_index/route.tsx` and
   `app/routes/_index/content.ts`
8. Remove `stripe` from `package.json` dependencies
9. Run `npm run db:generate` to create a migration dropping the tables
