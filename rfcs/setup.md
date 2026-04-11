# RFC: `setup` command

`mo setup` is an interactive wizard that checks prerequisites, collects user preferences, writes `morc.json`, and syncs the shell rc block.

## Usage

```bash
mo setup
```

## Steps

1. **Check `git`**: verify the `git` binary is available in `PATH`. Abort with instructions if not.
2. **Check `gh`**: verify the `gh` binary is available and the user is authenticated (`gh auth status`). Abort with instructions if not.
3. **Code root**: prompt for the directory where repos will be stored. Default to `~/code`. Expand `~` and validate the path exists (create it if the user confirms).
4. **Shell selection**: detect the current shell and prompt which shells mo should manage rc blocks for (`zsh`, `bash`, `fish`). At least one shell must be selected.
5. **Aliases**: offer optional short aliases per command. Suggested defaults:

   | Alias | Command    |
   | ----- | ---------- |
   | `k`   | `mo clone` |
   | `li`  | `mo list`  |

   The user can accept, modify, or skip each alias.

6. **Editor**: prompt for the editor binary to use with `mo edit`. Default to `$EDITOR` or `code` if unset.
7. **Write config**: save all collected values to `~/.config/morc.json`.
8. **Sync rc blocks**: write or update the `#_MO_START_` ... `#_MO_END_` block in each selected shell's rc file.

## Setup Guard

If a user runs any config-required command without a valid config, mo prints a warning and asks whether to run `mo setup` now.
