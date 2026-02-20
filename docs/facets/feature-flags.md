# feature-flags

## Description

Database-backed feature flags for gradual rollout, A/B testing, and
per-account/plan overrides. Flags are defined in code with a type-safe enum and
evaluated via a `flag(name, context)` helper that checks D1 for overrides before
falling back to the default. The admin panel exposes a flags UI for toggling
without a deploy.

## Related Files

_Not yet implemented._

## Removal

_Not yet implemented._
