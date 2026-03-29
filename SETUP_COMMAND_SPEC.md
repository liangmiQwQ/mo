# ghm setup command spec

## ghm setup command behavior

[Action] User runs `ghm setup`
[Eval] Check user's `git` and `gh` command status, exit with code 69 if they haven't installed the tools or unauth. Then prompt User: "What directory would you like to store all your projects?" with a space for inputting

[Action] User enters a path
[Eval] Check whether the path valid, exit with code 78 if got invalid one. Store the path in a variable and prompt "What kind of shell would you use?" with checkboxes of `zsh (~/.zshrc)`, `fish (~/.config/fish/config.fish)`, `bash (~/.bashrc)`

[Action] User chooses at least one shell
[Eval] Ensure whether these shell exist, or exit with code 69
[Eval] Generate the config file, and write shellrc. Load `ghm shell` with `source` cmd as well.

## ghm setup command integration

[Action] Users run their first command on `ghm` without global config or `--config` args.
[Eval] Prompt user: "No config found, would you like to run `ghm setup` first? (Y / N)"

[Action A] Users enter `Y`
[Eval A] Run switch to `setup` command, give up original task

[Action B] Users enter `N`
[Eval B] Exit with exit code 78
