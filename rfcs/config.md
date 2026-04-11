# RFC: Config System

`mo` reads a single JSON config file at `~/.config/morc.json`. If the file is missing, empty, or contains an invalid `root` path, the program exits with a clear error and tells the user to run `mo setup`.

## Config Shape

```json
{
  "root": "~/code",
  "editor": "code",
  "shells": ["zsh"],
  "alias": {
    "clone": ["k"],
    "list": ["li"]
  }
}
```

| Field    | Type                       | Required | Description                                          |
| -------- | -------------------------- | -------- | ---------------------------------------------------- |
| `root`   | `string`                   | yes      | Absolute or `~`-prefixed path to the code root       |
| `editor` | `string`                   | no       | Editor binary used by `mo edit` (e.g. `code`, `vim`) |
| `shells` | `string[]`                 | no       | Shells that mo manages rc blocks for                 |
| `alias`  | `Record<string, string[]>` | no       | Per-command shell alias list                         |

## Shell RC Block

When shells are configured, mo owns a fenced block in the corresponding rc file (`~/.zshrc`, `~/.bashrc`, `~/.config/fish/config.fish`). The block must not be edited by the user.

```bash
#_MO_START_
# Please do not edit the comments `#_MO_START_` or `#_MO_END_`, which probably makes mo feature broken.
... generated code
#_MO_END_
```

mo regenerates the content inside the block on every config change. The `preuninstall` script removes the block on `npm uninstall`.

## Error Handling

- Missing config file: print message and suggest `mo setup`, then exit non-zero.
- Invalid `root` (does not exist or is not a directory after expansion): same behavior.
- Unknown extra fields in config are silently ignored.

## Schema

A JSON Schema for the config file lives at `config_schema.json` at the repo root and can be used for editor autocompletion.
