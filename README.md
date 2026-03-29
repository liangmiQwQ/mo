# `ghm`

`ghm`, the *G*it*H*ub Project *M*anager for opensource developers.

> [!WARNING]
> This project is Unix-like (Mac / Linux) only for now.

```
npm i -g @liangmi/ghm
```

## Usage

### Config

Create `~/.config/ghmrc.json`:

```json
{
  "root": "~/code",
  "shells": ["zsh"]
}
```

`root` must exist and be a directory.
`shells` is required and must include at least one of `zsh`, `bash`, and `fish`.

### Commands

Clone a repo into `<root>/<owner>/<repo>`:

```bash
ghm clone vitejs/devtools
ghm c vitejs/devtools
```

List repos under `<root>`:

```bash
ghm list
ghm ls
```

### Options

Use a custom config path:

```bash
ghm --config /path/to/ghmrc.json list
```

## License

[MIT](./LICENSE) © Liang Mi
