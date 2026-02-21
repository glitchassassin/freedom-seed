# ui-icons

SVG sprite icon system sourced from [icones.js.org](https://icones.js.org)
(Iconify). Individual SVG files are compiled into a single sprite asset at build
time via `vite-plugin-icons-spritesheet`. The `Icon` component references
symbols in the sprite using `<use href="sprite.svg#name">` — zero runtime JS,
zero network requests per icon.

## Adding icons

1. Browse [icones.js.org](https://icones.js.org) and copy an Iconify ID (e.g.
   `lucide:arrow-right`).
2. Run `npm run icons:add lucide:arrow-right` (multiple IDs accepted).
3. The SVG lands in `other/svg-icons/lucide--arrow-right.svg`.
4. Restart `npm run dev` or run `npm run build` — the sprite and `IconName`
   union type are regenerated automatically.

**Naming convention**: colons become `--` in filenames and symbol IDs.
`lucide:x` → `lucide--x.svg` → `<Icon name="lucide--x" />`.

## Using icons

```tsx
import { Icon } from '~/components/ui/icon'

<Icon name="lucide--x" />                        // font-size (default)
<Icon name="lucide--x" size="sm" />              // 1rem (size-4)
<Icon name="lucide--x" title="Close" />          // accessible title
<Icon name="lucide--x">Close</Icon>              // icon + label, aligned
```

Available sizes: `font` (default) · `xs` · `sm` · `md` · `lg` · `xl`.

## Key files

| Path                                   | Purpose                                        |
| -------------------------------------- | ---------------------------------------------- |
| `other/svg-icons/*.svg`                | Source SVG files (committed)                   |
| `app/components/ui/icons/sprite.svg`   | Generated sprite (committed after first build) |
| `app/components/ui/icons/icon-name.ts` | Generated `IconName` union type                |
| `app/components/ui/icon.tsx`           | `Icon` React component                         |
| `scripts/icons.ts`                     | Fetch-and-save script (uses Iconify HTTP API)  |
| `vite.config.ts`                       | `iconsPlugin` configuration                    |

## Removal

1. Delete `app/components/ui/icon.tsx`, `app/components/ui/icons/`,
   `other/svg-icons/`, `scripts/icons.ts`.
2. Remove `iconsPlugin(...)` from `vite.config.ts`.
3. Remove `icons:add` from `package.json` scripts.
4. Uninstall: `npm uninstall -D vite-plugin-icons-spritesheet`.
5. Replace any `<Icon>` usages with inline SVG or another icon solution.
