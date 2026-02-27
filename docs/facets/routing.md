# routing

## Description

File-system routing via
[react-router-auto-routes](https://github.com/kenn/react-router-auto-routes).
Route files live in `app/routes/` and the route tree is generated automatically
from the folder structure — no manual registration in `routes.ts`.

The key principle: **folders are organizational, not structural**. Nesting only
happens when a folder contains `_layout.tsx`. Without it, a folder just keeps
files tidy without affecting the route tree.

## Conventions

| Pattern           | URL effect                         | Example                             |
| ----------------- | ---------------------------------- | ----------------------------------- |
| `index.tsx`       | Index route for its parent path    | `routes/blog/index.tsx` → `/blog`   |
| `_layout.tsx`     | Wraps children via `<Outlet />`    | `routes/blog/_layout.tsx`           |
| `_` folder prefix | Pathless layout group              | `routes/_auth/login.tsx` → `/login` |
| `$param`          | Dynamic segment                    | `routes/blog/$slug.tsx` → `/:slug`  |
| `($param)`        | Optional dynamic segment           | `routes/($lang)/home.tsx`           |
| `$.tsx`           | Catch-all / splat                  | `routes/$.tsx` → `/*`               |
| `[.]`             | Literal dot in URL                 | `routes/robots[.]txt.ts`            |
| `.` in filename   | Path separator (flat-file style)   | `routes/blog.index.tsx` → `/blog`   |
| `+` prefix        | Colocated non-route file (ignored) | `routes/blog/+components/chart.tsx` |

## Best Practices

1. **One route module per route** — keep the loader, action, component, and meta
   in a single `index.tsx` (or standalone `.tsx` file). Colocate helpers
   alongside it with the `+` prefix.
2. **Use `_layout.tsx` intentionally** — only add one when sibling routes
   actually share a persistent UI wrapper (sidebar, tabs). Omitting it keeps
   routes flat, which is usually what you want.
3. **Prefer folder-based to flat-file** — `blog/$slug/index.tsx` over
   `blog.$slug.tsx`. Folders make colocation natural and diffs clearer.
4. **Group with pathless layouts** — use `_auth/`, `_marketing/`, etc. to share
   a layout shell without adding a URL segment.
5. **Server-only code in `.server.ts`** — loaders/actions that import DB or
   secrets should live in `.server.ts` files or use
   `import … from '~/foo.server'` to tree-shake them from the client bundle.
6. **Keep route modules thin** — extract shared logic into `app/lib/` or
   colocated `+/` helpers. Route files should mostly wire loader → component.
7. **Name dynamic folders clearly** — `workspaces.$workspaceId/` beats
   `workspaces.$id/`. The param name appears in `params`, so make it
   self-documenting.
8. **Catch-all at the root** — place `$.tsx` at `routes/$.tsx` for a global 404
   page. Keep it separate from `index.tsx` to avoid error boundary conflicts.

## Action Validation

Actions that read form data **must** validate with Conform's `parseWithZod`:

```ts
import { parseWithZod } from '@conform-to/zod/v4'
import { z } from 'zod'
const schema = z.object({ name: z.string() })
export async function action({ request }: Route.ActionArgs) {
	const formData = await request.formData()
	const submission = parseWithZod(formData, { schema })
	if (submission.status !== 'success') return submission.reply()
	// use submission.value
}
```

**Intent-based actions** — dispatch to a per-intent schema after reading
`formData.get('intent')`. **Exempt** — actions that never read `formData` (e.g.
logout, WebAuthn challenge generation) may skip validation.

## Configuration

`app/routes.ts`:

```ts
import { autoRoutes } from 'react-router-auto-routes'

export default autoRoutes()
```

No further configuration is needed. Route files must use one of these
extensions: `.ts`, `.tsx`, `.js`, `.jsx`, `.md`, `.mdx`.

## Commands

```bash
npx react-router routes   # Print the calculated route tree (useful for debugging)
```

## Related Files

- `app/routes.ts` — route tree entry point (calls `autoRoutes()`)
- `app/routes/` — all route modules live here
- `react-router.config.ts` — React Router config (SSR flag, future flags)

## Removal

1. `npm uninstall react-router-auto-routes`
2. Replace `app/routes.ts` with manual route definitions or switch to
   `@react-router/fs-routes`
