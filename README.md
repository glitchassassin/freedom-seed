# Freedom Seed

An AI-ready starter template with React Router 7 on Cloudflare Workers. Includes
sensible Cursor rules to speed development and establish guardrails.

This is a seed which, defined by good documentation and planning, will grow
under the care of code agents into something beautiful

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
