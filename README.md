# Freedom Seed

An opinionated framework for building small SaaS products with React Router 7 on
Cloudflare Workers. Designed to keep human and AI developers moving fast without
accumulating technical debt.

**Efficiency** — Lightweight edge infrastructure with instant preview builds,
hot reload in development, and a deploy pipeline that stays out of your way.

**Robustness** — End-to-end tests with accessibility coverage, error boundaries
on every route, and Cloudflare observability enabled by default.

**Modularity** — Features are self-contained, files stay small, and
cross-cutting concerns are documented rather than left implicit. The codebase
stays readable as it grows.

**Automation** — A local D1 database keeps development fully offline, all
commands are documented for coding agents, and a CI pipeline runs type checks,
linting, and E2E tests on every push.

## First Steps

After cloning this repository, personalize it for your project:

### 1. Update Package Configuration

Edit `package.json` and update:

- **`name`**: Change from `"freedom-seed"` to your project name (e.g.,
  `"my-awesome-app"`)
- **`description`**: Add a description of your project (optional)

### 2. Update Cloudflare Worker Configuration

Edit `wrangler.jsonc` and update:

- **`name`**: Change from `"freedom-seed"` to your project name (must match
  Cloudflare Worker naming conventions)
  - Use lowercase letters, numbers, and hyphens only
  - Example: `"my-awesome-app"` or `"my-awesome-app-production"`

### 3. Update Repository Information

- Update the repository URL in `package.json` if you're publishing to npm
- Update any references to "freedom-seed" in documentation files
- Update the README title and description above

### 4. Set Up CI/CD and Cloudflare

Follow the [setup instructions](docs/operations/setup.md) to configure:

- GitHub Actions secrets for CI/CD
- Cloudflare account and worker deployment
- Optional: Enable preview deployments and production deployments

### 5. Customize Application Code

- Update `app/routes/_index/route.tsx` with your landing page
- Replace logo files in `app/routes/_index/` with your own branding
- Update `app/root.tsx` with your app's metadata and structure
- Customize `app/app.css` with your design system

## Docs to Index

- [Cloudflare](https://developers.cloudflare.com/llms.txt)
- [React Router](https://reactrouter.com/home)
- Playwright (built in to Cursor!)
