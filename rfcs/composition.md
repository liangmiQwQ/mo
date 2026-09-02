# RFC: `composition` command

`mo composition` command allows users to run multiple commands in one single call.

## Purpose

Most of the time, users do not use `mo clone` or `mo fork` isolatedly, they typically use them in conjunction with commands such as `cd` or `edit`.

```bash
mo clone vuejs/core
mo cd vuejs/core
# Or mo edit vuejs/core
```

And considering `mo cd` or `mo edit` command require the repo spec again, it can cause repeated input and be quite annoying.

It can be simplified like that with `mo composition`.

```bash
mo composition clone cd vuejs/core
```

## Command detail

We provide three arguments for `mo composition` command. All of three are required, even if `repo`.

```bash
mo composition <main-command> <sub-commands> <repo>
```

Main command is the first command to run. It can be `fork` or `clone`. If this command receive any option or flag, it should be passed to the main command.

`<repo>` must be an explicit remote repository. `.` is not accepted, including when the main command is `fork`.

Sub commands are a set of commands split with `,`, it will be run one by one. It can include `edit`, `open`, `cd` commands. The command's received option and flag should not influence these command. (For example, `mo composition clone cd,edit vuejs/core`)

If the main command failed, the sub commands should not be executed.

This command is not designed to be called directly with `mo`, it is mainly for global alias uses, so we don't provide alias like `mo com` for it. Also, the commands composed in the command should not be alias (`mo composition c cd` is not allowed) .

## Global Alias Use

We provide `compositionAlias` option in settings, when it enables, we inject composed alias to shellrc.

For example, if users use `fr` for fork, `i` for `cd`, `e` and `ed` for `edit`, We provide aliases like these

- `fri` is `mo composition fork cd`
- `frie` is `mo composition cd,edit`
- `fredi` is `mo composition edit,cd`

etc.

## Implement detail

I personally don't hope to see `mo composition` just to be a command spawner to just call `mo`, I want it to be able to run the command in its inner program and compose logic.
