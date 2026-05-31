---
name: global-projects
description: Use when Codex needs to find, open, create, clone, or reason about projects on this computer using the user's global project layout. This skill explains the standard rootPath/owner/project convention, how to resolve the configured rootPath from morc.json, how to infer project paths, and when to use mo list, mo clone, or mo fork.
---

# Global Projects

The user manages source repositories under one configured root directory. Treat this as the default place to search for local projects before assuming a repository is missing.

Standard path shape:

```text
<rootPath>/<github-owner-or-org>/<repo>
```

Examples:

```text
~/code/vuejs/core
~/code/vitejs/vite
~/code/liangmiQwQ/mo
```

## Resolve `rootPath`

`mo setup` writes the config to `~/.config/morc.json`. The `root` field is the project root and may contain `~` or a relative path. Resolve it before composing project paths.

Use code like this when TypeScript/JavaScript is the easiest way to read the config:

```ts
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { parse } from 'jsonc-parser'

type MoConfig = {
  root?: string
}

function expandHome(value: string): string {
  if (value === '~') {
    return homedir()
  }

  if (value.startsWith('~/')) {
    return path.join(homedir(), value.slice(2))
  }

  return value
}

export function getMoRootPath(): string | undefined {
  const configPath = path.join(homedir(), '.config', 'morc.json')

  if (!existsSync(configPath)) {
    return undefined
  }

  const config = parse(readFileSync(configPath, 'utf8')) as unknown

  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return undefined
  }

  const { root } = config as MoConfig
  if (!root) {
    return undefined
  }

  return path.resolve(path.dirname(configPath), expandHome(root))
}
```

If `getMoRootPath()` returns `undefined`, ask the user before creating or cloning anything. They may need to run `mo setup`.

## Know A Project Path

For a GitHub repo identifier like `owner/repo`, the local path should be:

```text
<rootPath>/owner/repo
```

For a GitHub URL, extract the owner and repo first:

```text
https://github.com/vitejs/vite -> <rootPath>/vitejs/vite
git@github.com:vuejs/core.git -> <rootPath>/vuejs/core
```

When the user gives only a project name or a fuzzy query:

1. Run `mo list` to inspect managed repositories.
2. Prefer exact repo name matches.
3. If multiple owners match, ask the user to choose.
4. Use the resolved path directly for file operations.

## Command Usage

Use `mo list` to discover existing managed repositories.

```bash
mo list
```

Use `mo clone <owner>/<repo>` when the user wants a GitHub project locally and it is not already under `<rootPath>/<owner>/<repo>`.

```bash
mo clone vitejs/vite
```

Use `mo fork` only when the user explicitly asks to fork or create a fork. Forking changes remote GitHub state and is dangerous as an implicit action.

```bash
mo fork vitejs/vite
```

Do not replace `mo clone` with `mo fork` for convenience. If the user only asks to inspect, edit, build, test, or clone a project, do not fork.

## Working Standard

- Search under `rootPath` before using broad filesystem scans.
- Preserve the `<owner>/<repo>` organization when cloning projects.
- Do not create unrelated project layouts outside `rootPath` unless the user asks.
- When operating across projects, name both the owner and repo in status updates so the target is clear.
- Use `mo` commands for repository discovery and GitHub project placement; use normal shell and editor tooling once the local path is known.
