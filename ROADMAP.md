# `ghm` Project Feature and Road Map

## - [x] Stage One: Basic Feature Setup

### - [x] Basic Config System

Require `~/.config/ghmrc.json` as the config file like below.

```json
{
  "root": "~/code"
}
```

Exit program for no config file (as well as empty or with an unvaild path)

### - [x] `clone` command

`ghm clone <user>/<repo>`

alias `ghm c`

e.g. `ghm clone vitejs/devtools`

It will clone the repo to `~/code/vitejs/devtools`, create dir if not exist.

### - [x] `list` command

`ghm list`

alias `ghm ls`

Show the all repos available.

## - [ ] Stage Two: Better UX

### - [ ] `setup` command

Add a `ghm setup` command, to setup the settings and environment needed.

Add a prompt to ask whether user want to initial the tool first if users try run commands before setup.

Include:

- Check `git` command status
- Check `gh` command status (include auth)
- Ask user's code directory
- Ask whether to add even more simple alias for `ghm` command, let user to decide what alias to add but give suggestions (`i` for `ghm`, `k` for `ghm clone`, `li` for `ghm list`).

### - [ ] `ghm` main command

`ghm`

A wrapper of `cd` command

Display a prompt, allow users to enter repo name to cd to it, also allow user cd to the root path or the owner path. (like cd to `~/code`, or `~/code/vitejs`)

Because it needs to cd to the target directory, it needs to be a shell script. We change the `bin` name to `ghmi` and use a cli wrapper `ghm`(function) to call it with the support of fish, zsh, bash. use `preunistall` to clear the config when users uninstall.

## - [ ] Stage Three: Add `fork` and `remote` control

It's a big feature, need `gh` and `git` commands work together, leave a blank for now.

## - [ ] Stage Four: Editor Support

### - [ ] `editor` option

Add `editor` option in `~/.config/ghmrc.json`, modify `setup` command as well.

```json
{
  "root": "~/code",
  "editor": "code"
}
```

### - [ ] `edit` command

Add `ghm edit` command to open the repo in the editor. For example, `ghm open vitejs/devtools` which actually runs `code ~/code/vitejs/devtools`.

The prompt logic should be similar as `ghm` command. Use `-e` or `--editor` to specify the editor.

Alias: `ghm e`

### - [ ] `open` command

Alias `ghm o`

A wrapper for `ghm edit -e open` to open the project in system finder / explorer.

## - [ ] Stage Five: Editor Plugin

Similar to `Project Manager` or `Git Project Manager` extension in VSCode. This is a fairly long-term plan, so leave a blank for now.
