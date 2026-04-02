# `ghm` Agent Guide

`ghm` is a set of command line tools, used to manage multiple repos globally.

## Product Features

The core feature of the project is maintaining a certain directory structure for multiple repos in the path users stores their code. The directory structure is like this:

```bash
.
├── [Github User/Org name]
│ ├── [Repo Name]
│ └── ...
└── ...
```

Like `~/code/vitejs/vite`, `~/code/vuejs/vue`, `~/code/vuejs/core`.

Read [ROADMAP](/ROADMAP.md) to learn more about project architecture and the road map.

Shell integration is managed through `ghmrc.json` `shells` (`zsh`/`bash`/`fish`) and ghm-controlled shellrc blocks.
`ghm setup` initializes config by checking `git`/`gh` availability, collecting root directory/shells, optionally collecting command aliases, then writing config and syncing shellrc.
If users run config-required commands without default config, ghm should prompt to run `ghm setup` first.
`preinstall` blocks unsupported Windows installs and rejects non-global package installs (except contributor installs in the source repo).
`ghm cd` should be handled through shell functions: resolve path via `ghm cd`, run `ghmi cd` to print pending target from `GHM_CD_TARGET` (or `.` when empty), and execute shell `cd` immediately.
Local development wrappers are managed by `vp run dev:i` and `vp run dev:uni`, targeting `~/.local/bin/ghm` and `~/.local/bin/ghmi`.

## Rule

Vite+ is used as the project manager. Use `vp install` to install dependencies, use `vp install -D` if the adden dependency can be bundled. Use `vp run` command to run commands in `package.json`. Do not use `pnpm` or `npm` directly.

Run `vp check` (lint and format) after you make changes.

Tests are disabled for now.

Keep AGENTS.md updated with the project codebase. Consider if there is need to modify AGENTS.md after your changes. Don't store meaningless things like project structure or project status in AGENTS.md.

Never use emoji no matter where.

Keep code functional. Never use classes. Write simple code and make function reusable if possible. Use Unix philosophy to design your code (Every function should only do one thing and should not be too long or complex).

The project is designed for opensource developers on GitHub, consider about it if you need to make any decision. Do not import features out of its scope.

Use existing dependencies and tools. Feel free to add dependencies. Don't reinvent the wheel. Should always use `cac` for cli command parsing and `picocolors` for output formatting

Add `.gitkeep` file when creating new empty directory
