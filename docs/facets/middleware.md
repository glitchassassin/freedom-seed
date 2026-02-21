# middleware

## Description

React Router v8 middleware (`future.v8_middleware: true`) allows code to run
before and after every route handler in a subtree. Middleware can read/mutate
the request, short-circuit with a redirect/response, attach typed values to the
React Router `RouterContextProvider`, and append headers to the response after
`next()` resolves.

This stack uses middleware for cross-cutting concerns that must run on every
request — things like reading flash cookies and seeding context — rather than
duplicating that logic in every loader.

## How it works

1. `v8_middleware: true` in `react-router.config.ts` activates the feature.
2. Route modules export `middleware: Route.MiddlewareFunction[]`.
3. Middleware at a parent route runs for all descendant routes (nesting order).
4. Each function receives `({ request, params, context }, next)`:
   - **Before `next()`** — read cookies, validate auth, attach context values.
   - **`await next()`** — runs the remaining middleware chain + the
     loader/action.
   - **After `next()`** — mutate the response (append headers, etc.).
5. Middleware must `return response` if it calls `next()`.

## Context API

The `context` argument is a `RouterContextProvider` — a typed Map keyed by
`RouterContext<T>` objects created with `createContext()`. Context values set in
middleware are readable in any downstream loader or action via
`context.get(key)`.

```ts
// app/utils/some-context.ts
import { createContext } from 'react-router'
export const someContext = createContext<SomeType | null>(null)

// In middleware
context.set(someContext, value)

// In loader
const value = context.get(someContext)
```

## Current Middleware

| Route          | Middleware       | Purpose                                                                                     |
| -------------- | ---------------- | ------------------------------------------------------------------------------------------- |
| `app/root.tsx` | toast middleware | Reads `en_toast` cookie → sets `toastContext`; after `next()` appends clearing `Set-Cookie` |

## Related Files

- `react-router.config.ts` — `future.v8_middleware: true`
- `app/utils/cloudflare-context.ts` — `cloudflareContext` key +
  `getCloudflare()` helper
- `app/utils/toast-context.ts` — `toastContext` key for flash toast
- `workers/app.ts` — seeds `RouterContextProvider` with `cloudflareContext`
  before passing to the handler
- `app/root.tsx` — `middleware` export (toast cookie lifecycle)

## When to Add Middleware

Add middleware when logic needs to:

- Run on every request in a subtree (not just one route)
- Read the request and attach context for downstream loaders
- Append response headers after all handlers have run
- Short-circuit with a redirect (e.g., auth guard for a whole layout group)

Do **not** use middleware for logic that only applies to a single route — put
that in the route's own loader/action.

## Removal

1. Remove `v8_middleware: true` from `react-router.config.ts`.
2. Delete all `middleware` exports from route modules.
3. Move any context-seeding logic back into individual loaders as needed.
4. Replace `context.get(someContext)` calls with direct function calls.
