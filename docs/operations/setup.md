# Setup Instructions

This document provides step-by-step instructions for setting up GitHub Actions
CI/CD and Cloudflare resources for your project.

## GitHub Actions CI/CD Setup

### Overview

The project includes a GitHub Actions workflow (`.github/workflows/ci.yml`) that
provides:

- **CI**: Linting, type checking, and building on every push and pull request
- **Playwright**: End-to-end testing with Playwright
- **Deploy Preview**: Preview deployments for pull requests (disabled by
  default)
- **Deploy Production**: Production deployments on main/master branch (disabled
  by default)

### Step 1: Configure GitHub Secrets

Set up the required secrets in your GitHub repository:

1. Navigate to your repository on GitHub
2. Go to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add the following:

#### Required Secrets

- **`CLOUDFLARE_API_TOKEN`**
  - Generate a token from the
    [Cloudflare dashboard](https://dash.cloudflare.com/profile/api-tokens)
  - Recommended permissions:
    - Account: Workers Scripts:Edit
    - Account: Workers KV Storage:Edit
    - Account: Account Settings:Read
  - Copy the token and save it as a secret

- **`CLOUDFLARE_ACCOUNT_ID`**
  - Find your Account ID in the
    [Cloudflare dashboard](https://dash.cloudflare.com/)
  - It's displayed in the right sidebar of the dashboard
  - Copy the Account ID and save it as a secret

### Step 2: Enable Deployment Jobs (Optional)

The deployment jobs are disabled by default. To enable them:

1. Open `.github/workflows/ci.yml`
2. For **Preview Deployments** (PR previews):
   - Change line 57 from `if: false` to:
     ```yaml
     if: github.event_name == 'pull_request'
     ```
   - Remove or comment out the `if: false` line

3. For **Production Deployments**:
   - Change line 112 from `if: false` to:
     ```yaml
     if:
       github.event_name == 'push' && (github.ref == 'refs/heads/main' ||
       github.ref == 'refs/heads/master')
     ```
   - Remove or comment out the `if: false` line

### Step 3: Verify Workflow

1. Push a commit to your repository
2. Navigate to the **Actions** tab in GitHub
3. Verify that the CI and Playwright jobs run successfully
4. If you enabled deployments, verify those jobs run as expected

## Cloudflare Resources Setup

### Step 1: Create a Cloudflare Account

1. Sign up for a [Cloudflare account](https://dash.cloudflare.com/sign-up) if
   you don't have one
2. Complete the account setup process

### Step 2: Configure Wrangler

1. Install Wrangler globally (optional, but helpful for local testing):

   ```bash
   npm install -g wrangler
   ```

2. Authenticate Wrangler:
   ```bash
   wrangler login
   ```
   This will open a browser window to authenticate with Cloudflare.

### Step 3: Update Worker Configuration

1. Open `wrangler.jsonc` in your project
2. Update the `name` field to match your project name:
   ```jsonc
   "name": "your-project-name",
   ```
3. Review and configure any additional settings:
   - **compatibility_date**: Update if needed for newer features
   - **vars**: Add any environment variables
   - **bindings**: Configure any Cloudflare bindings (KV, D1, R2, etc.)

### Step 4: Deploy Your Worker

1. Build your application:

   ```bash
   npm run build
   ```

2. Deploy to Cloudflare:

   ```bash
   npm run deploy
   ```

   Or use Wrangler directly:

   ```bash
   wrangler deploy
   ```

3. Verify the deployment in the
   [Cloudflare dashboard](https://dash.cloudflare.com/)

### Step 5: Configure Custom Domain (Optional)

Configure custom domains and routes in `wrangler.jsonc`:

1. Open `wrangler.jsonc` in your project
2. Add a `routes` array to configure custom domains or routes:

   ```jsonc
   {
   	// ... other configuration ...
   	"routes": [
   		{
   			"pattern": "example.com/*",
   			"custom_domain": true,
   		},
   		{
   			"pattern": "api.example.com/*",
   		},
   	],
   }
   ```

   Or use the simpler `route` format for single routes:

   ```jsonc
   {
   	// ... other configuration ...
   	"route": "example.com/*",
   }
   ```

3. For custom domains, ensure your domain is added to Cloudflare and DNS is
   configured
4. Deploy again to apply the route configuration:

   ```bash
   npm run deploy
   ```

   Note: Custom domains require your domain to be managed by Cloudflare. See the
   [Cloudflare Workers Routes documentation](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
   for more details.

### Step 6: Set Up Environment Variables and Secrets

1. In the Cloudflare dashboard, go to **Workers & Pages** → Your Worker →
   **Settings**
2. Navigate to **Variables and Secrets**
3. Add any environment variables or secrets your application needs
4. For secrets, use:
   ```bash
   wrangler secret put SECRET_NAME
   ```

## Troubleshooting

### GitHub Actions Issues

- **Secrets not found**: Verify secrets are set correctly in repository settings
- **Build failures**: Check Node.js version compatibility (requires
  Node >=22.0.0)
- **Deployment failures**: Verify Cloudflare API token has correct permissions

### Cloudflare Issues

- **Authentication errors**: Run `wrangler login` again
- **Deployment errors**: Check `wrangler.jsonc` configuration
- **Worker not responding**: Verify the worker is deployed and active in
  dashboard

## Additional Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
