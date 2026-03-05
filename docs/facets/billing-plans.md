# billing-plans

## Description

Defines subscription tiers (free, pro, enterprise) and maps them to feature
entitlements and usage limits. Plan state is derived from the Stripe
subscription record stored in D1 and is checked via a `getWorkspacePlan()`
helper used in loaders and actions. Includes free trial logic (`trialEndsAt`),
grace periods after failed payment, and per-seat quantity sync.

## Related Files

- `app/db/schema.ts` — `billingPlans` table (operator-managed, seeded)
- `app/utils/billing/billing.server.ts` — `getBillingPlans()`,
  `getBillingPlanBySlug()`, `getWorkspacePlan()`
- `app/utils/billing/require-plan.server.ts` — `requirePlan()` helper for plan
  gating
- `scripts/db-seed.ts` — seeds default plans (free, pro, enterprise)
- `tests/factories/billing.ts` — `createBillingPlan()`, `createSubscription()`
  test factories
- `app/routes/_index/content.ts` — marketing pricing data
- `app/routes/_index/route.tsx` — `PricingSection` component

## Removal

1. Remove `billingPlans` table from `app/db/schema.ts`
2. Remove billing plan functions from `app/utils/billing/billing.server.ts`
3. Delete `app/utils/billing/require-plan.server.ts`
4. Remove billing plan seeding from `scripts/db-seed.ts`
5. Delete `tests/factories/billing.ts` and remove exports from
   `tests/factories/index.ts`
6. Remove pricing data from `app/routes/_index/content.ts` and `PricingSection`
   from `app/routes/_index/route.tsx`
7. Run `npm run db:generate` to create a migration dropping the table
