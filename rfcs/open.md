# RFC: `open` command

`mo open` opens a repository in the system default browser. It shares the same interactive selector and <target> resolver as `mo cd`.

## Usage

```bash
mo open [<target>]
mo open .
mo open https://github.com/<owner>/<repo>
mo open https://github.com/<owner>/<repo>.git
mo o [<target>]     # alias
```

## Behavior

It shares the same select and command argument logic as `mo edit`, `mo cd`

`<target>` can be `.`, a search query, `<owner>/<repo>`, or a GitHub repository URL. `.` opens the managed project containing the current directory, including from a nested directory.

It opens the default browser with the GitHub page of the repo. For example, runs `mo o vite` will open https://github.com/vitejs/vite

## Aliases

| Alias | Command   |
| ----- | --------- |
| `o`   | `mo open` |
