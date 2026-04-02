# Contributing to `ghm`

Thanks for contributing to `ghm`.

## Prerequisites

- macOS or Linux
- [`vp`](https://github.com/voidzero-dev/vite-plus) installed
- `git` and `gh` available in your shell

## Setup

1. Install dependencies:

```bash
vp install
```

2. Install development global wrappers:

```bash
vp run dev:i
```

This creates:

- `~/.local/bin/ghm`
- `~/.local/bin/ghmi`

Both wrappers run local source files through `tsx`.

## Verify Commands

```bash
ghm --help
ghmi --help
```

## Uninstall Development Wrappers

```bash
vp run dev:uni
```

`dev:uni` only removes wrappers managed by `dev:i`.

## Quality Check

Run this before opening a PR:

```bash
vp check
```

## Project Rules

- Use Vite+ commands (`vp ...`) for project tasks.
- Do not use `npm` or `pnpm` directly for this repo workflow.
- Tests are currently disabled.
