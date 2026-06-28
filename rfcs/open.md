# RFC: `open` command

`mo open` opens a repository in the system file manager. It shares the same pending shell action flow as `mo edit`, with `open` as the editor command.

## Usage

```bash
mo open [<user>/<repo>]
mo o [<user>/<repo>]     # alias
```

## Behavior

Equivalent to `mo edit --editor open [<user>/<repo>]`, but implemented through the same internal command path as `mo edit`.

- On macOS, `open` opens Finder.
- On Linux, `open` should be mapped to `xdg-open`.

## Aliases

| Alias | Command   |
| ----- | --------- |
| `o`   | `mo open` |
