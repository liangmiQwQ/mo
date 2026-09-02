# `mo` Agent Guide

`mo` is a set of command line tools, used to manage multiple repos globally.

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

Read [ROADMAP](/ROADMAP.md) to learn more about project architecture and the road map. If you want detailed information about some feature, view [RFCS](/rfcs) directory.

Shell integration is managed through `morc.json` `shells` (`zsh`/`bash`/`fish`) and `free-shellrc`-controlled shellrc blocks.
`mo setup` initializes config by checking `git`/`gh` availability, collecting root directory/shells, optionally collecting command aliases and composition aliases, then writing config and syncing shellrc.
`mo composition <main-command> <sub-commands> <repo>` runs `clone`/`fork` first, then runs `cd`/`edit`/`open` subcommands against the same repo without spawning nested `mo` commands.
If users run config-required commands without default config, mo should prompt to run `mo setup` first.
`preinstall` blocks unsupported Windows installs and rejects non-global package installs (except contributor installs in the source repo).
`mo cd` and `mo edit` should be handled through shell functions: main `mo` commands write pending shell actions, then `mo-inner actions <shell>` prints shell code for `cd`/editor actions and the shell wrapper executes it in the parent shell. `mo open` launches the resolved GitHub URL directly in the system default browser.
`mo cd`, `mo edit`, and `mo open` accept search queries, `<owner>/<repo>`, or GitHub repository URLs for existing local repos; `.` resolves the current managed project root from any nested directory for those commands and `mo fork .`, while clone and composition still require explicit remote repository specs.
Interactive selector UI is built as Vue SFCs rendered by `@vue-tui/runtime`; keep the Vue plugin under `pack.plugins` so `vp pack` can compile `.vue` files.
Vite+ configuration inherits the `cli` preset from `@liangmi/vp-config`; keep local overrides limited to project-specific behavior.
`vp pack` generates the ignored `dist-moi` alias package for `@liangmi/moi` through the pack `build:done` hook; the alias package exposes `moi`, `moi-get-root`, and `moi-inner` with the same version as `@liangmi/mo`, without root-only scripts, dev dependencies, or package-manager metadata.
Local development wrappers are managed by `vp run dev:mo`, `vp run dev:moi`, `vp run dev:mouni`, and `vp run dev:moiuni`, targeting the matching `~/.local/bin/mo*` or `~/.local/bin/moi*` commands; each wrapper runs Vite+ pack quietly before executing the bundled `bin` entry with `node`.
The GitHub-installed `global-projects` skill selects `moi` or `mo` through the matching `*-get-root` bin before running project commands, so an unrelated `mo` executable is never mistaken for this CLI.
The GitHub-installed `contribute-to-open-source` skill standardizes external contribution work around `mo fork`, `upstream`/`origin` remotes, contribution branches, and upstream pull requests.

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
