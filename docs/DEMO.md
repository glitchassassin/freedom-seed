# Seed Vault — Demo Application

Seed Vault is the reference application built on Freedom Seed. It demonstrates
the starter template's capabilities through a practical, real-world use case: a
collaborative app for cataloging seeds with growing information and photos.

## Concept

Users sign up, create a personal vault, and start adding seeds. Each seed entry
holds basic growing data (plant name, variety, planting season, days to
germination, sun/water needs, notes) and one or more uploaded photos.

Users can also create **teams** to share vaults collaboratively. Team members
are invited by email and assigned a role:

| Role       | Browse seeds | Add / edit seeds | Manage members | Delete team |
| ---------- | ------------ | ---------------- | -------------- | ----------- |
| **Viewer** | Yes          | No               | No             | No          |
| **Editor** | Yes          | Yes              | No             | No          |
| **Owner**  | Yes          | Yes              | Yes            | Yes         |

A user can belong to multiple teams and always has a personal vault that is not
shared.

## Data Model

The demo adds these tables alongside the existing auth/session tables:

```
seeds
  ├─ id: UUID (PK)
  ├─ vaultId: UUID (FK → vaults.id)
  ├─ name: string              — e.g. "Tomato"
  ├─ variety: string (nullable) — e.g. "Cherokee Purple"
  ├─ plantingSeason: string (nullable) — e.g. "Spring"
  ├─ daysToGermination: integer (nullable)
  ├─ sunRequirement: string (nullable) — "full" | "partial" | "shade"
  ├─ waterFrequency: string (nullable) — "low" | "moderate" | "high"
  ├─ notes: text (nullable)
  ├─ createdBy: UUID (FK → users.id)
  ├─ createdAt: timestamp
  └─ updatedAt: timestamp

seedPhotos
  ├─ id: UUID (PK)
  ├─ seedId: UUID (FK → seeds.id, cascade delete)
  ├─ storageKey: string        — R2 object key
  ├─ altText: string (nullable)
  ├─ sortOrder: integer
  ├─ uploadedBy: UUID (FK → users.id)
  └─ createdAt: timestamp

vaults
  ├─ id: UUID (PK)
  ├─ teamId: UUID (FK → teams.id, nullable) — null = personal vault
  ├─ ownerId: UUID (FK → users.id)          — creator
  ├─ name: string
  ├─ createdAt: timestamp
  └─ updatedAt: timestamp

teams
  ├─ id: UUID (PK)
  ├─ name: string
  ├─ createdBy: UUID (FK → users.id)
  ├─ createdAt: timestamp
  └─ updatedAt: timestamp

teamMembers
  ├─ teamId: UUID (FK → teams.id)
  ├─ userId: UUID (FK → users.id)
  ├─ role: string              — "owner" | "editor" | "viewer"
  ├─ joinedAt: timestamp
  └─ PRIMARY KEY (teamId, userId)

teamInvitations
  ├─ id: UUID (PK)
  ├─ teamId: UUID (FK → teams.id)
  ├─ email: string
  ├─ role: string              — "editor" | "viewer"
  ├─ invitedBy: UUID (FK → users.id)
  ├─ tokenHash: string (UNIQUE) — SHA-256 of invitation token
  ├─ expiresAt: timestamp
  ├─ acceptedAt: timestamp (nullable)
  └─ createdAt: timestamp
```

## Routes

```
/                              Home / marketing landing
/login                         Sign in          (existing)
/signup                        Register         (existing)
/forgot-password               Password reset   (existing)
/reset-password                Reset form       (existing)

/vaults                        List personal + team vaults
/vaults/new                    Create a vault
/vaults/:vaultId               Seed list for a vault
/vaults/:vaultId/seeds/new     Add a seed
/vaults/:vaultId/seeds/:seedId View / edit a seed

/teams                         List teams
/teams/new                     Create a team
/teams/:teamId/settings        Team settings (name, danger zone)
/teams/:teamId/members         Manage members + invitations
/teams/:teamId/audit-log       Audit log       (existing route, scoped)

/invitations/accept?token=...  Accept a team invitation

/settings/change-password      Change password  (existing)
/settings/profile              Edit display name
```

## Facets Exercised

The demo intentionally exercises as many Freedom Seed facets as practical:

| Facet          | How the demo uses it                               |
| -------------- | -------------------------------------------------- |
| auth-sessions  | Login / signup / logout                            |
| auth-password  | Email + password registration and login            |
| database       | All CRUD through Drizzle ORM on D1                 |
| routing        | Filesystem routes with nested layouts              |
| middleware     | Session + toast + RBAC checks                      |
| ui-components  | Forms, tables, dialogs, dropdowns across all pages |
| ui-icons       | Icons for seeds, teams, roles, actions             |
| dark-mode      | Full app theming                                   |
| notifications  | Toast feedback on every mutation                   |
| audit-log      | Log team-scoped events (invite, role change, etc.) |
| env-validation | R2 bucket binding + any new secrets                |
| teams          | Team creation, settings, deletion                  |
| invitations    | Email-based team invitations with token flow       |
| rbac           | Viewer / Editor / Owner role enforcement           |
| file-storage   | Seed photo upload to Cloudflare R2                 |
| email          | Invitation emails via Resend                       |
| timezones      | Date display in user's local timezone              |
| analytics      | Plausible page tracking                            |

## Implementation Order

Build the demo in phases, each producing a shippable increment:

### Phase 1 — Personal Vault (CRUD)

- Schema: `vaults`, `seeds` tables
- Routes: vault list, create vault, seed list, add/edit/view seed
- UI: forms with validation, seed card grid, empty states
- Facets used: database, routing, ui-components, notifications

### Phase 2 — Seed Photos

- Schema: `seedPhotos` table
- File upload to Cloudflare R2 (pre-signed URLs)
- Photo gallery on seed detail page, drag-to-reorder
- Facets used: file-storage, env-validation

### Phase 3 — Teams & Roles

- Schema: `teams`, `teamMembers` tables
- Team creation, member management, role assignment
- RBAC middleware to enforce viewer/editor/owner permissions
- Team-scoped vaults (team vault vs personal vault)
- Facets used: teams, rbac, audit-log

### Phase 4 — Invitations

- Schema: `teamInvitations` table
- Invite flow: generate token, send email, accept link
- Invitation management UI (pending, resend, revoke)
- Facets used: invitations, email

### Phase 5 — Polish

- Profile settings (display name)
- Responsive layout and mobile refinements
- Empty-state illustrations
- SEO meta tags on public pages

## Replacing the Demo With Your Project

Freedom Seed is designed so the demo layer peels off cleanly. After cloning the
template, follow these steps to replace Seed Vault with your own domain:

### 1. Remove demo schema and routes

Delete these files/directories:

```
app/routes/vaults/
app/routes/teams/            (demo-specific team routes only)
app/routes/invitations/
```

In `app/db/schema.ts`, remove the `seeds`, `seedPhotos`, and `vaults` tables.
Keep `teams`, `teamMembers`, and `teamInvitations` if your app needs
multi-tenancy — otherwise remove those too.

Generate a fresh migration:

```bash
npx drizzle-kit generate
```

### 2. Remove demo components

Delete any components created specifically for the seed UI (seed cards, photo
gallery, vault selectors). Shared UI components in `app/components/ui/` are part
of the template and should be kept.

### 3. Update the home page

Replace `app/routes/_index/route.tsx` with your own landing page or app
dashboard.

### 4. Audit remaining references

Search for "seed", "vault", and "Seed Vault" across the codebase:

```bash
grep -ri "seed\|vault" app/ --include="*.ts" --include="*.tsx" -l
```

Update or remove any leftover references.

### 5. Keep what you need

These pieces are **not** demo-specific and should stay:

- Auth routes and utilities (`login`, `signup`, `forgot-password`, etc.)
- Session and password infrastructure
- Middleware (session, toast)
- UI component library and icon system
- Dark mode, notifications, timezone support
- Audit log infrastructure (rename team scoping if needed)
- Database client and migration setup
- Env validation
- Analytics integration

### 6. Rename the project

Update these files with your project name:

- `package.json` — `name` field
- `wrangler.jsonc` — `name` field and D1 database name
- `app/root.tsx` — page title and meta
- This file — delete `docs/DEMO.md` entirely

### Quick Reference

| Want to keep...        | Keep these files                                                  |
| ---------------------- | ----------------------------------------------------------------- |
| Auth (password)        | `app/utils/session.server.ts`, `password.server.ts`, auth routes  |
| Teams & RBAC           | `teams`/`teamMembers` schema, team routes, RBAC middleware        |
| File uploads           | R2 utilities, `file-storage` facet implementation                 |
| Everything except demo | Delete `seeds`, `seedPhotos`, `vaults` schema + vault/seed routes |
