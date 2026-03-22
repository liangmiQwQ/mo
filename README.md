# `ghm`

`ghm`, the *G*it*H*ub Project *M*anager for opensource.

## Stage One

### Config

Create `~/.config/ghm.json`:

```json
{
  "root": "~/code"
}
```

`root` must exist and be a directory.

### Commands

Clone a repo into `<root>/<owner>/<repo>`:

```bash
ghm clone vitejs/devtools
ghm c vitejs/devtools
```

If `<owner>/<repo>` is omitted and the terminal is interactive, `ghm` will prompt for it.

List repos under `<root>`:

```bash
ghm list
ghm ls
```

### Options

Use a custom config path:

```bash
ghm --config /path/to/ghm.json list
```

## License

[MIT](./LICENSE) © Liang Mi
