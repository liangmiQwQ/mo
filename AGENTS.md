# `mo` Agent Guide

`mo` is a set of command line tools, used to manage multiple repos globally.

## Product Features

The core feature of the project is maintaining a `<owner>/<repo>` directory structure for multiple repos in the path where users store their code, like `~/code/vitejs/vite`, `~/code/vuejs/vue`, `~/code/vuejs/core`.

Read [ROADMAP](/ROADMAP.md) to learn more about project architecture and the road map. If you want detailed information about some feature, view [RFCS](/rfcs) directory.

## Rules

Vite+ is used as the project manager. Use `vp install` to install dependencies, use `vp install -D` if the added dependency can be bundled. Use `vp run` command to run commands in `package.json`. Do not use `pnpm` or `npm` directly.

Run `vp check` (lint and format) after you make changes.

Tests are disabled for now.

Keep AGENTS.md updated with the project codebase. Consider if there is need to modify AGENTS.md after your changes. Only record non-obvious rules and gotchas in AGENTS.md. Feature behavior belongs in RFCs; update the matching RFC instead.

Never use emoji no matter where.

Keep code functional. Never use classes. Write simple code and make function reusable if possible. Use Unix philosophy to design your code (Every function should only do one thing and should not be too long or complex).

The project is designed for open source developers on GitHub, consider about it if you need to make any decision. Do not add features out of its scope.

Use existing dependencies and tools. Feel free to add dependencies. Don't reinvent the wheel. Should always use `cac` for cli command parsing and `picocolors` for output formatting.

Add `.gitkeep` file when creating new empty directory.
