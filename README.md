# `ghm`

`ghm`, the *G*it*H*ub Project *M*anager for opensource.

```
npm i -g @liangmi/ghm
```

## Stage One

### Config

Create `~/.config/ghmrc.json`:

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
