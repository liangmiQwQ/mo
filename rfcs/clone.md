# RFC: `clone` command

`mo clone` clones a GitHub repository into the structured code root managed by `mo`.

## Usage

```bash
mo clone <owner>/<repo>
mo clone https://github.com/<owner>/<repo>
mo clone https://github.com/<owner>/<repo>.git
mo c <owner>/<repo>      # alias
```

Example: `mo clone vitejs/vite` clones to `<root>/vitejs/vite`.
Example: `mo clone https://github.com/vuejs/core.git` clones to `<root>/vuejs/core`.

## Behavior

1. Parse `<owner>/<repo>` from the argument or GitHub repository URL.
2. Resolve destination: `<root>/<owner>/<repo>`.
3. Create intermediate directories if they do not exist.
4. Run `git clone https://github.com/<owner>/<repo>.git <destination>`.
5. Print the cloned path on success.

## Aliases

| Alias | Command    |
| ----- | ---------- |
| `c`   | `mo clone` |

Additional per-user aliases can be configured in `morc.json` `alias.clone` and are added to the shell rc block by `mo setup`.
