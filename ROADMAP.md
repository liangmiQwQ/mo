# `mo` Project Feature and Road Map

## - [x] Stage One: Basic Feature Setup

### - [x] Basic Config System

Require `~/.config/morc.json` as the config file like below.

```json
{
  "root": "~/code"
}
```

Exit program for no config file (as well as empty or with an unvaild path)

### - [x] `clone` command

`mo clone <user>/<repo>`

alias `mo c`

e.g. `mo clone vitejs/devtools`

It will clone the repo to `~/code/vitejs/devtools`, create dir if not exist.

### - [x] `list` command

`mo list`

alias `mo ls`

Show the all repos available.

## - [ ] Stage Two: Better UX

This stage will import some features related to shell and shellrc. We need to support fish, zsh, bash.

All the modify to shellrc should be controlled by mo. So, we need to storage user's setting like alias in morc config, and maintain a struct like this in shellrc file and update it each run.

```bash
#_MO_START_
# Please do not edit the comments `#_MO_START_` or `#_MO_END_`, which probably makes mo feature broken.
... code there
#_MO_END_
```

Use `preunistall` to clear the config when uninstall.

### - [x] `setup` command

Add a `mo setup` command, to setup the settings and environment needed.

Add a prompt to ask whether user want to initial the tool first if users try run commands before setup.

1. Check `git` command status
2. Check `gh` command status (include auth)
3. Ask user's code directory
4. Ask whether to add even more simple alias for `mo` command, let user to decide what alias to add but give suggestions (`i` for `mo`, `k` for `mo clone`, `li` for `mo list`).

The config file should be like:

```json
{
  "root": "~/code",
  "shells": ["zsh"],
  "alias": {
    "clone": ["k"],
    "list": ["li"]
  }
}
```

### - [x] `mo cd` command

`mo cd`

A wrapper of `cd` command

Display a prompt, allow users to enter repo name to cd to it, also allow user cd to the root path or the owner path. (like cd to `~/code`, or `~/code/vitejs`)

Because it needs to cd to the target directory, it needs to be a shell script. We need add a wrapper `mo`(function) to call it.

## - [ ] Stage Three: Add `fork` and `remote` control

It's a big feature, need `gh` and `git` commands work together, leave a blank for now.

## - [ ] Stage Four: Editor Support

### - [ ] `editor` option

Add `editor` option in `~/.config/morc.json`, modify `setup` command as well.

```json
{
  "root": "~/code",
  "editor": "code"
}
```

### - [ ] `edit` command

Add `mo edit` command to open the repo in the editor. For example, `mo open vitejs/devtools` which actually runs `code ~/code/vitejs/devtools`.

The prompt logic should be similar as `mo` command. Use `-e` or `--editor` to specify the editor.

Alias: `mo e`

### - [ ] `open` command

Alias `mo o`

A wrapper for `mo edit -e open` to open the project in system finder / explorer.

## - [ ] Stage Five: Editor Plugin

Similar to `Project Manager` or `Git Project Manager` extension in VSCode. This is a fairly long-term plan, so leave a blank for now.
