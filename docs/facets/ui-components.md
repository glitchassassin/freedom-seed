# ui-components

## Description

shadcn/ui component library: copy-paste Radix UI primitives pre-styled with
Tailwind. Components live in `app/components/ui/` and are owned by the project
(not a dependency), so they can be freely modified. Includes buttons, inputs,
dialogs, dropdowns, tables, badges, and form wrappers with Zod + Conform
validation integration.

## Related Files

- `app/utils/cn.ts` — `cn()` helper combining clsx + tailwind-merge
- `components.json` — shadcn CLI config (aliases pointing to `~/`)
- `app/app.css` — OKLCH color-token CSS variables + `@theme inline` Tailwind v4
  registration + typography scale
- `app/components/ui/button.tsx` — Button with variants (default, destructive,
  outline, secondary, ghost, link)
- `app/components/ui/input.tsx` — Text input with aria-invalid styling
- `app/components/ui/label.tsx` — Radix label primitive
- `app/components/ui/textarea.tsx` — Textarea with aria-invalid styling
- `app/components/ui/checkbox.tsx` — Radix checkbox with custom SVG indicator
- `app/components/ui/dropdown-menu.tsx` — Radix dropdown menu with full sub-menu
  support
- `app/components/ui/dialog.tsx` — Radix dialog/modal with overlay and
  animations
- `app/components/ui/badge.tsx` — Inline badge with variants
- `app/components/ui/table.tsx` — Semantic table primitives
- `app/components/forms.tsx` — Conform + Zod aware Field, TextareaField,
  CheckboxField, ErrorList wrappers

## Removal

1. Uninstall packages:
   `npm uninstall class-variance-authority clsx tailwind-merge @radix-ui/react-slot @radix-ui/react-label @radix-ui/react-checkbox @radix-ui/react-dialog @radix-ui/react-dropdown-menu zod @conform-to/react @conform-to/zod`
2. Delete `app/utils/cn.ts`, `components.json`, `app/components/ui/`,
   `app/components/forms.tsx`
3. Remove OKLCH color tokens and typography scale from `app/app.css`
