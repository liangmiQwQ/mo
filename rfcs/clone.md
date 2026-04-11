# RFC: `clone` command

`mo clone` clones a GitHub repository into the structured code root managed by `mo`.

## Usage

```bash
mo clone <user>/<repo>
mo c <user>/<repo>      # alias
```

Example: `mo clone vitejs/vite` clones to `<root>/vitejs/vite`.

## Behavior

1. Parse `<user>/<repo>` from the argument.
2. Resolve destination: `<root>/<user>/<repo>`.
3. Create intermediate directories if they do not exist.
4. Run `gh repo clone <user>/<repo> <destination>`.
5. Print the cloned path on success.

## Aliases

| Alias | Command    |
| ----- | ---------- |
| `c`   | `mo clone` |

Additional per-user aliases can be configured in `morc.json` `alias.clone` and are added to the shell rc block by `mo setup`.
