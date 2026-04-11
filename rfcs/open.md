# RFC: `open` command

`mo open` opens a repository in the system file manager. It is a thin wrapper around `mo edit -e open`.

## Usage

```bash
mo open [<user>/<repo>]
mo o [<user>/<repo>]     # alias
```

## Behavior

Equivalent to `mo edit --editor open [<user>/<repo>]`.

- On macOS, `open` opens Finder.
- On Linux, `open` should be mapped to `xdg-open`.

## Aliases

| Alias | Command   |
| ----- | --------- |
| `o`   | `mo open` |
