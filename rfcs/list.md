# RFC: `list` command

`mo list` prints all repositories found under the configured code root.

## Usage

```bash
mo list
mo ls       # alias
```

## Behavior

1. Walk one level of `<root>` for owner directories.
2. Walk one level of each owner directory for repo directories.
3. Print every `<owner>/<repo>` pair, one per line.
4. Directories beginning with `.` are ignored.

## Aliases

| Alias | Command   |
| ----- | --------- |
| `ls`  | `mo list` |

Additional per-user aliases can be configured in `morc.json` `alias.list` and are added to the shell rc block by `mo setup`.
