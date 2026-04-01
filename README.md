# `ghm`

`ghm` is a GitHub project manager for open source developers.

```bash
vp install -g @liangmi/ghm
```

It keeps your local repositories organized under one predictable layout:

```text
~/code
├── vitejs
│   ├── vite
│   └── devtools
└── vuejs
    ├── core
    └── vue
```

```text
<root>/<owner>/<repo>
```

## Requirements

- macOS or Linux (Windows is not supported)
- global install (local install is not supported for runtime usage)
- `git`
- GitHub CLI `gh` authenticated (`gh auth status`)

## Quick Start

Run setup once:

```bash
ghm setup
```

`ghm setup` will:

1. check `git`
2. check `gh` authentication
3. ask for your projects root directory
4. ask which shell(s) you use (`zsh`, `bash`, `fish`)
5. optionally collect command aliases
6. write `~/.config/ghmrc.json`
7. sync managed shellrc blocks

After setup:

```bash
ghm clone vitejs/vite
ghm list
```

## Commands

### `ghm setup`

Initialize config and shell integration.

### `ghm clone <owner>/<repo>`

Clone a GitHub repository into `<root>/<owner>/<repo>`.

Alias: `ghm c <owner>/<repo>`

Example:

```bash
ghm clone vuejs/core
```

### `ghm list`

List repositories under your configured root.

Alias: `ghm ls`

## Config

Default config path:

```text
~/.config/ghmrc.json
```

Example:

```json
{
  "$schema": "https://raw.githubusercontent.com/liangmiQwQ/ghm/main/config_schema.json",
  "root": "~/code",
  "shells": ["zsh"],
  "alias": {
    "ghm": ["i"],
    "clone": ["k"],
    "list": ["li"]
  }
}
```

### Fields

- `root` (required): absolute path or `~` path for your projects directory
- `shells` (required): one or more of `zsh`, `bash`, `fish`
- `alias` (optional): alias arrays for `ghm`, `clone`, `list`

Alias names must match:

```text
[A-Za-z_][A-Za-z0-9_-]*
```

## Shell Integration

`ghm` manages shell integration blocks in your shellrc files:

- `~/.zshrc`
- `~/.bashrc`
- `~/.config/fish/config.fish`

## Notes

- If you run config-required commands without config, `ghm` prompts you to run `ghm setup`.
- `ghm list` only shows repositories that are Git repos with a GitHub remote.

## Contribution

We're really excited to receive your contributions! Please see [ROADMAP.md](./ROADMAP.md) for details!

## License

[MIT](./LICENSE) © Liang Mi
