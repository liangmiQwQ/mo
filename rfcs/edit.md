# RFC: `edit` command

`mo edit` opens a repository in the configured editor. It shares the same interactive selector and <target> resolver as `mo cd`.

## Usage

```bash
mo edit [<target>] [-e <editor>]
mo edit https://github.com/<owner>/<repo> [-e <editor>]
mo edit https://github.com/<owner>/<repo>.git [-e <editor>]
mo e [<target>] [-e <editor>]     # alias
```

- If `<target>` is omitted, the selector opens.
- `<target>` can be a search query, `<owner>/<repo>`, or a GitHub repository URL.
- `-e` / `--editor` overrides the editor set in `morc.json`.

## Behavior

1. Resolve the target path through the selector or the provided argument.
2. Determine the editor: flag > `morc.json` `editor` > `$EDITOR`.
3. When shell integration is active, write a pending editor action and let `mo-inner actions <shell>` print the shell command that starts the editor from the parent shell.
4. If shell integration is not active, run the editor directly with Node and package-manager environment variables removed, and `node_modules/.bin` entries removed from `PATH`.

## Aliases

| Alias | Command   |
| ----- | --------- |
| `e`   | `mo edit` |
