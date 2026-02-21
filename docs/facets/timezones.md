# Timezones

SSR-safe date display in the user's local timezone, using client-hints cookies
to make the browser's timezone available to the server before rendering.

## Status: Implemented

## How it works

1. `<ClientHintCheck />` in `<head>` runs inline JS that reads
   `Intl.DateTimeFormat().resolvedOptions().timeZone` and stores it in a cookie
   (`CH-time-zone`). If the cookie is absent or stale, the page reloads once.
2. On every subsequent request the server reads the cookie via
   `getHints(request)` and formats timestamps using `@date-fns/tz` before
   returning loader data.
3. SSR and client render the same pre-formatted string — no hydration mismatch.

## Related Files

- `app/utils/client-hints.tsx` — `getHints`, `useHints`, `ClientHintCheck`
- `app/root.tsx` — injects `<ClientHintCheck />` in `<head>`, exposes `hints`
  from the root loader

## Usage in a loader

```ts
import { format } from 'date-fns'
import { tz } from '@date-fns/tz'
import { getHints } from '~/utils/client-hints'

export async function loader({ request }: LoaderArgs) {
	const { timeZone } = getHints(request) // e.g. "America/New_York"
	const formatted = format(date, 'MMM d, yyyy, h:mm a zzz', {
		in: tz(timeZone),
	})
	return { formatted }
}
```

## Usage in a component

```tsx
import { useHints } from '~/utils/client-hints'

// hints.timeZone — available client-side when root loader data is present
```

## Packages

- `@epic-web/client-hints` — cookie-based client hint detection
- `date-fns` — date formatting utilities
- `@date-fns/tz` — timezone context for date-fns v4 (`tz()` helper)

## Removal

1. Uninstall `@epic-web/client-hints`, `date-fns`, and `@date-fns/tz`
2. Delete `app/utils/client-hints.tsx`
3. Remove `<ClientHintCheck />` and `getHints` from `app/root.tsx`
4. Replace `createdAtFormatted` with a plain ISO string in any loader that uses
   it
