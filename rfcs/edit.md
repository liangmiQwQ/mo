# RFC: `edit` command

`mo edit` opens a repository in the configured editor. It shares the same interactive selector as `mo cd`.

## Usage

```bash
mo edit [<user>/<repo>] [-e <editor>]
mo e [<user>/<repo>] [-e <editor>]     # alias
```

- If `<user>/<repo>` is omitted, the selector opens.
- `-e` / `--editor` overrides the editor set in `morc.json`.

## Behavior

1. Resolve the target path through the selector or the provided argument.
2. Determine the editor: flag > `morc.json` `editor` > `$EDITOR`.
3. Run `<editor> <path>`.

## Aliases

| Alias | Command   |
| ----- | --------- |
| `e`   | `mo edit` |

`mo edit`, `mo cd`, and `mo open` share the same selector and path-resolution logic. Differences are only in the final action performed on the resolved path.
