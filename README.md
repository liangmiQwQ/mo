# `mo`

`mo` stands for "**M**anage your **O**pensource projects"

Just keep your repos organized like this:

```text

$ tree

~/code
├── vitejs
│   ├── vite
│   └── devtools
└── vuejs
    ├── core
    └── vue

```

## Install

```bash

vp install -g @liangmi/mo

```

## Requirements

- macOS or Linux (Windows is not supported)
- global install (local install is not supported for runtime usage)
- `git`
- GitHub CLI `gh` authenticated (`gh auth status`)

## Quick Start

Run setup once:

```bash
mo setup
```

`mo setup` will:

1. check `git`
2. check `gh` authentication
3. ask for your projects root directory
4. ask which shell(s) you use (`zsh`, `bash`, `fish`)
5. optionally collect aliases for `mo clone`, `mo list`, and `mo cd`
6. write `~/.config/morc.json`
7. sync managed shellrc blocks

After setup:

```bash
mo clone vitejs/vite
mo list
mo cd
```

## Commands

### `mo setup`

Initialize config and shell integration.

### `mo clone <owner>/<repo>`

Clone a GitHub repository into `<root>/<owner>/<repo>`.

Alias: `mo c <owner>/<repo>`

Example:

```bash
mo clone vuejs/core
```

### `mo list`

List repositories under your configured root.

Alias: `mo ls`

### `mo cd [target]`

Resolve and jump to a managed path in your shell integration function.

Without `target`, it opens an interactive selector for:

- root
- owner directory
- repository directory

With `target`, supported forms are:

- `root` or `.`
- `<owner>`
- `<owner>/<repo>`

Alias: `mo d`

## Config

Default config path:

```text
~/.config/morc.json
```

Example:

```json
{
  "$schema": "https://raw.githubusercontent.com/liangmiQwQ/mo/main/config_schema.json",
  "root": "~/code",
  "shells": ["zsh"],
  "alias": {
    "clone": ["k"],
    "list": ["li"],
    "cd": ["i"]
  }
}
```

### Fields

- `root` (required): absolute path or `~` path for your projects directory
- `shells` (required): one or more of `zsh`, `bash`, `fish`
- `alias` (optional): alias arrays for `clone`, `list`, `cd`

Alias names must match:

```text
[A-Za-z_][A-Za-z0-9_-]*
```

## Shell Integration

`mo` manages shell integration blocks in your shellrc files:

- `~/.zshrc`
- `~/.bashrc`
- `~/.config/fish/config.fish`

## Notes

- If you run config-required commands without config, `mo` prompts you to run `mo setup`.
- `mo list` only shows repositories that are Git repos with a GitHub remote.

## Contribution

We're really excited to receive your contributions! Please see [ROADMAP.md](./ROADMAP.md) for details!

## License

[MIT](./LICENSE) © Liang Mi
