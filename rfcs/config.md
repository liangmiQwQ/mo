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
  },
  "compositionAlias": true
}
```

| Field              | Type                       | Required | Description                                          |
| ------------------ | -------------------------- | -------- | ---------------------------------------------------- |
| `root`             | `string`                   | yes      | Absolute or `~`-prefixed path to the code root       |
| `editor`           | `string`                   | no       | Editor binary used by `mo edit` (e.g. `code`, `vim`) |
| `shells`           | `string[]`                 | no       | Shells that mo manages rc blocks for                 |
| `alias`            | `Record<string, string[]>` | no       | Per-command shell alias list                         |
| `compositionAlias` | `boolean`                  | no       | Should provide alias like `ke` for `mo composition`  |

## Shell RC Block

When shells are configured, `free-shellrc` owns a fenced block for the installed package in the corresponding rc file (`~/.zshrc`, `~/.bashrc`, `~/.config/fish/config.fish`). The block must not be edited by the user.

```bash
# >>> _@liangmi/mo_START >>>
# Please do not edit this managed block.
... generated code
# <<< _@liangmi/mo_END <<<
```

mo syncs the block before config-required commands. If the installed package disappears, the block removes itself the next time the shell profile loads.

## Error Handling

- Missing config file: print message and suggest `mo setup`, then exit non-zero.
- Invalid `root` (does not exist or is not a directory after expansion): same behavior.
- Unknown extra fields in config are silently ignored.

## Schema

A JSON Schema for the config file lives at `config_schema.json` at the repo root and can be used for editor autocompletion.
