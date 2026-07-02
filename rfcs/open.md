# RFC: `open` command

`mo open` opens a repository in the system file manager. It shares the same pending shell action flow as `mo edit`, with `open` as the editor command.

## Usage

```bash
mo open [<target>]
mo open https://github.com/<owner>/<repo>
mo open https://github.com/<owner>/<repo>.git
mo o [<target>]     # alias
```

## Behavior

Equivalent to `mo edit --editor open [<target>]`, but implemented through the same internal command path as `mo edit`.

`<target>` can be a search query, `<owner>/<repo>`, or a GitHub repository URL.

- On macOS, `open` opens Finder.
- On Linux, `open` should be mapped to `xdg-open`.

## Aliases

| Alias | Command   |
| ----- | --------- |
| `o`   | `mo open` |
