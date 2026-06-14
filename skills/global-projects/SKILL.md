---
name: global-projects
description: "Load this skill when you need to locate, enter, clone, open, or coordinate work across the user's local projects. Use it when the current directory is not the target project, when another local project is needed, or when multiple projects are involved. The user's standard is rootPath/github-owner/repo, managed by mo."
---

# Global Projects

Use this skill to follow the user's project organization standard. `mo` is the user's CLI for managing global projects; the skill is mainly about the directory standard and when to use `mo`.

Standard layout:

```text
<rootPath>/<github-owner-or-org>/<repo>
```

Examples:

```text
~/code/vuejs/core
~/code/vitejs/vite
~/code/liangmiQwQ/mo
```

## First Step

Skill loading does not automatically execute commands. When a task needs the project root, run the resolver first:

```bash
mo-get-root
```

It only reads `~/.config/morc.json` and prints JSON with `rootPath`. If `rootPath` is missing, ask the user before creating or cloning anything; they may need to run `mo setup`.

## Project Path Rules

After resolving `rootPath`, infer paths yourself.

For a GitHub repo identifier, join the pieces directly:

```text
owner/repo -> <rootPath>/owner/repo
```

For a GitHub URL:

```text
https://github.com/vitejs/vite -> <rootPath>/vitejs/vite
git@github.com:vuejs/core.git -> <rootPath>/vuejs/core
```

For a bare project name or fuzzy query:

1. Run `mo list` or inspect one level under `rootPath`.
2. Prefer exact repo-name matches.
3. Prefer exact `owner/repo` matches when the user gave an owner.
4. If multiple owners match, ask the user to choose.
5. Use the resolved path directly for file operations.

## `mo` Command Usage

Use `mo` when you need to clone/fork/create a project. Once you know the local path, use normal shell and editor tooling for ordinary file reads, edits, builds, and tests.

Use `mo list` to discover existing managed repositories:

```bash
mo list
```

Use `mo clone <owner>/<repo>` when the user wants a GitHub project locally and it is not already under `<rootPath>/<owner>/<repo>`. This preserves the owner/repo layout:

```bash
mo clone vitejs/vite
```

Use `mo init` to make a local project initialized using git and create a GitHub repo, only when the user explicitly asks to create/init a project:

```bash
mo init [options]

# Options, at least one of them should be provided if you
# --public    Create as public repository
# --private   Create as private repository
```

`mo init` can change remote GitHub state. Treat it as a dangerous command.

Use `mo fork` only when the user explicitly asks to fork or create a fork:

```bash
mo fork vitejs/vite
mo fork vitejs/vite --org my-org
mo fork vitejs/vite --name my-vite
```

Forking also changes remote GitHub state. Treat it as a dangerous command. Do not fork for inspection, editing, testing, cloning, opening, or convenience. It also includes some prompts you need to answer.

## Working Standard

- Search under `rootPath` before broad filesystem scans.
- Preserve the `<owner>/<repo>` organization when cloning projects.
- Avoid creating project directories outside `rootPath` unless the user asks.
- Name both owner and repo in status updates for cross-project work.
- Use `mo` for repository discovery and placement; use normal shell and editor tooling once the local path is known.
