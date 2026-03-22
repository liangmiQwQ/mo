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

Please refer to [ROADMAP](/ROADMAP.md) to learn more about project architecture and the road map.

## Rule

Vite+ is used as the project manager. Use `vp install` to install dependencies. Use `vp run` command to run commands in `package.json`. Do not use `pnpm` or `npm` directly.

Update tests or add new tests after you add a new feature or fix a bug if possible.

Run `vp test` and `vp check` after you make changes.

Keep AGENTS.md updated with the project codebase. Consider if there is need to modify AGENTS.md after your changes. Don't store meaningless things like project structure or project status in AGENTS.md.

Never use emoji in docs.

Write simple code and make function reusable if possible. Use Unix philosophy to design your code (Every function should only do one thing and should not be too long or complex.)

The project is designed for opensource developers on GitHub using MacOS or Linux, consider about it if you need to make any decision. Do not import features out of its scope.

You can use some format for output, like red / red background for errors. But don't use too much color or format. Keep it simple and clean.

Dependencies addition is not banned. Dependencies are always better than do it by yourself. But don't add dependencies without any reason. Try to use existing tools instead of adding new dependencies.
