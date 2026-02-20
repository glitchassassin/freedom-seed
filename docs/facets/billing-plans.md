# billing-plans

## Description

Defines subscription tiers (free, pro, enterprise) and maps them to feature
entitlements and usage limits. Plan state is derived from the Stripe
subscription record stored in D1 and is checked via a `getPlan(team)` helper
used in loaders and actions. Includes free trial logic (`trialEndsAt`), grace
periods after failed payment, and per-seat quantity sync.

## Related Files

_Not yet implemented._

## Removal

_Not yet implemented._
