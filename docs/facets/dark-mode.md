# dark-mode

## Description

SSR-safe theme switching using client-hints cookies to detect the OS color
scheme preference and an explicit user preference cookie to override it. A
`dark` class is toggled on `<html>` server-side, so Tailwind's `dark:` variant
works without a flash-of-wrong-theme.

Three states: **light**, **dark**, and **system** (follow OS). The system state
is the default and uses the `CH-prefers-color-scheme` client-hint cookie. An
explicit preference is stored in `en_theme`.

## How it works

1. `<ClientHintCheck />` in `<head>` runs inline JS that reads
   `window.matchMedia('(prefers-color-scheme: dark)')` and stores the result in
   `CH-prefers-color-scheme`. It also subscribes to OS theme changes and
   triggers a revalidation so the UI updates live.
2. The root loader calls `getHints(request)` (→ `hints.theme`) and
   `getTheme(request)` (→ `userPrefs.theme`).
3. `Layout` in `root.tsx` calls `useOptionalTheme()` to resolve the effective
   theme and applies `className="dark"` to `<html>`.
4. The `ThemeSwitch` component submits a fetcher POST to
   `/resources/theme-switch`, which sets `en_theme` and returns. No page reload
   required.

## Related Files

- `app/utils/client-hints.tsx` — `getHints`, `useHints`, `useOptionalHints`,
  `ClientHintCheck` (includes color-scheme hint and scheme-change subscription)
- `app/utils/theme.server.ts` — `getTheme`, `setTheme`, `Theme` type
- `app/routes/resources/theme-switch/index.tsx` — action, `ThemeSwitch`
  component, `useTheme`, `useOptionalTheme`, `useOptimisticThemeMode`
- `app/root.tsx` — calls `getTheme` in loader, applies `.dark` class in Layout
- `app/app.css` — `@custom-variant dark` overrides Tailwind's dark variant to
  use `.dark` class instead of `prefers-color-scheme` media query

## Usage

Drop `<ThemeSwitch>` anywhere in your layout:

```tsx
import { ThemeSwitch } from '~/routes/resources/theme-switch/index'

// In a nav or footer:
;<ThemeSwitch userPreference={loaderData.userPrefs.theme} />
```

Read the resolved theme in a component:

```tsx
import { useTheme } from '~/routes/resources/theme-switch/index'

const theme = useTheme() // 'light' | 'dark'
```

## Removal

1. Delete `app/utils/theme.server.ts`
2. Delete `app/routes/resources/theme-switch/`
3. In `app/utils/client-hints.tsx`: remove the `colorSchemeHint` import,
   `subscribeToSchemeChange` import and effect, `useOptionalHints`, and the
   `theme` entry from `getHintUtils`
4. In `app/root.tsx`: remove `getTheme` import, `userPrefs` from loader return,
   `useOptionalTheme` import, and `className={...}` from `<html>`
5. In `app/app.css`: remove the `@custom-variant dark` line and restore the
   `@media (prefers-color-scheme: dark)` block if needed
