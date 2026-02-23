# Local Development with DevPod

This project includes a `.devcontainer` configuration that provides a
reproducible Node 22 dev environment with neovim and tmux pre-installed.
[DevPod](https://devpod.sh) can provision it against any provider (local Docker,
a cloud VM, etc.).

## Prerequisites

- [DevPod](https://devpod.sh/docs/getting-started/install) installed
- A configured DevPod provider (e.g. `devpod provider add docker`)

## Launch the workspace

```bash
devpod up . --ide none
```

DevPod builds the container from `.devcontainer/devcontainer.json`, runs
`npm install`, and starts an SSH server inside the container. The `--ide none`
flag skips the IDE launcher so you can connect manually via SSH or tmux.

To open a shell directly:

```bash
devpod ssh .
```

## Bring your neovim and tmux config

DevPod supports **dotfiles repositories** — a personal git repo that it clones
into the container and installs on first start. This is the recommended way to
get your `~/.config/nvim`, `~/.config/tmux` (or `~/.tmux.conf`), and any other
shell config into the workspace automatically.

### 1. Create a dotfiles repo (if you don't have one)

Structure it however you like. The only requirement is an executable install
script at the repo root. A minimal example:

```
dotfiles/
├── install.sh          # entry point — DevPod runs this
├── config/
│   ├── nvim/           # your neovim config
│   └── tmux/           # your tmux config
```

`install.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

DOTFILES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

mkdir -p "$HOME/.config"
ln -sf "$DOTFILES_DIR/config/nvim"  "$HOME/.config/nvim"
ln -sf "$DOTFILES_DIR/config/tmux"  "$HOME/.config/tmux"
```

### 2. Register the dotfiles repo with DevPod

In the DevPod desktop app go to **Settings → Dotfiles** and enter your repo URL,
or set it via the CLI:

```bash
devpod context set-options -o DOTFILES_URL=https://github.com/you/dotfiles
```

DevPod will clone the repo inside the workspace and run `install.sh` as part of
container setup.

### 3. Rebuild the workspace to apply

If the workspace already exists:

```bash
devpod up . --recreate
```

## First-run setup

After the workspace starts, apply the local database migrations:

```bash
npm run db:migrate
```

Wrangler creates a local SQLite file at `.wrangler/state/v3/d1/`. No Cloudflare
account is needed for local development.

Create a `.dev.vars` file if you have secrets that can't be committed (e.g.
session keys, API keys). The base vars (`ENVIRONMENT`, `PLAUSIBLE_DOMAIN`, etc.)
already have defaults in `wrangler.jsonc` and don't need to be repeated here
unless you want to override them.

## Start the dev server

```bash
npm run dev
```

The Vite dev server listens on port 5173. DevPod forwards it automatically —
you'll get a notification with the local URL. Port 4173 is also forwarded for
`npm run preview`, which is the target used by Playwright E2E tests.

## Stop and resume

```bash
devpod stop .    # hibernate the workspace
devpod up .      # resume it
devpod delete .  # destroy it entirely
```
