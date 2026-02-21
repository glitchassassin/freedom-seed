# notifications

## Description

Client-side toast notification system for surfacing action feedback (success,
error, warning, info). Toasts are triggered from Route actions via a flash
cookie pattern — the action sets a short-lived cookie, the next page render
reads and displays it, then the cookie is cleared. This works across full
navigations as well as client-side fetcher submissions. Powered by
[Sonner](https://sonner.emilkowal.ski/).

## How it works

1. A Route action calls `showToast(toast, redirectTo)`, which redirects and sets
   the `en_toast` cookie (Max-Age 60 s).
2. The root `middleware` runs on every request: it calls `getToast(request)`,
   stores the parsed toast in React Router context, then after `next()` appends
   a `Set-Cookie: Max-Age=0` header to the response to clear the cookie.
3. The root loader reads the toast from context and passes it (with a unique
   `toastKey`) to the client.
4. The root `App` component fires `toast[type](title, { description })` via
   `useEffect` whenever a new `toastKey` arrives.
5. `<Toaster>` (rendered once in the root) displays the notification, syncing
   with the app's dark/light theme automatically.

## Related Files

- `app/utils/toast.server.ts` — `getToast`, `setToast`, `showToast`, `Toast`
  type
- `app/utils/toast-context.ts` — React Router context key for the flash toast
- `app/components/ui/sonner.tsx` — theme-aware `<Toaster>` wrapper
- `app/root.tsx` — `middleware` (reads cookie, clears it on response); loader
  (reads context, generates `toastKey`); `App` (fires toast, renders
  `<Toaster>`)

## Usage

**In a Route action:**

```ts
import { showToast } from '~/utils/toast.server'

export async function action({ request }: Route.ActionArgs) {
	// ... do work ...
	return showToast({ type: 'success', title: 'Profile updated' }, '/settings')
}
```

**With a description:**

```ts
return showToast(
	{ type: 'error', title: 'Upload failed', description: 'Max size is 5 MB.' },
	'/upload',
)
```

**Manual cookie (when you need custom response headers too):**

```ts
import { redirect } from 'react-router'
import { setToast } from '~/utils/toast.server'

return redirect('/dashboard', {
	headers: {
		'set-cookie': setToast({ type: 'info', title: 'Signed in' }),
		'x-custom': 'value',
	},
})
```

## Removal

1. `npm uninstall sonner`
2. Delete `app/utils/toast.server.ts`, `app/utils/toast-context.ts`, and
   `app/components/ui/sonner.tsx`
3. In `app/root.tsx`: remove the `middleware` export; remove `getToast`,
   `toastContext` imports; remove `toast`/`toastKey` from loader; remove
   `useEffect`/`toast` imports, the `useEffect` block, and `<Toaster />` from
   the JSX
4. Remove `v8_middleware: true` from `react-router.config.ts` if no other
   middleware remains
