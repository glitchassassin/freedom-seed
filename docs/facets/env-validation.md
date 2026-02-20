# env-validation

## Description

Zod schema validation of all Worker bindings and environment variables at
startup. If a required binding is missing or malformed, the Worker throws
immediately with a descriptive error rather than failing silently at the call
site. Each facet that introduces an env dependency registers its requirements in
a central schema.

## Related Files

_Not yet implemented._

## Removal

_Not yet implemented._
