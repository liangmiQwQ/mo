# RFC: Fork

Stage Four adds `mo fork` for forking GitHub repos

## Motivation

Open source contributors frequently need to:

- Fork an upstream repo and clone the fork to the local code root.
- Keep `upstream` and `origin` remotes in sync with the expected `mo` directory layout.
- Switch between different remote configurations without leaving the `mo` workflow.

## Proposed Commands

### `mo fork`

```bash
mo fork <user>/<repo>
```

Alias: `mo f` or global default `fr`

Basically it is a wrapper around `mo clone` and `gh repo fork`. It should clone the repo to the local and create fork remotely with `gh` command.

The cloning and forking should be done in parallel to save the time. After cloning, the original repo should be set as `upstream` remote and the fork should be set as `origin` remote. `git branch --set-upstream-to=upstream/${defaultBranch}` should be run as well.

If the `gh repo fork` failed to run while `clone` running or finished successfully, the `clone` should be interrupted and the cloned repo should be deleted. If the `clone` failed to run while `gh repo fork` running or finished successfully, the `gh repo fork` should be kept but showing user a warning that the fork is created.

The fork command can be called without any arguments. In that case, it transform the current repo in the current dir into a fork (skip cloning). Exit with errors if the current dir is not a mo's managed repo or the user tries fork the repo to the same repo (allow the same owner even but add a prompt to confirm, just prevent the same name with the same owner). Also exit if there are already `upstream` remote.

For example, `mo f -o liangmiQwQ -n mo liangmiQwQ/mo` should be failed, but `mo f liangmiQwQ/mo -o liangmiQwQ -n wa` should be allowed but with a prmopt (before other prmopt).

### Details

#### Repo location

The repo location should be the same as cloning.

#### Forked repo path

The repo created remotely could be controlled detailedly (the owner name and repo name).

##### Control with options and config

Two options `--org` (-o), `--name` (-n) could be used to specify the target org name and repo name. like `mo fork vitejs/vite -o liangmiQwQ -n vite`. And `https://github.com/liangmiQwQ/vite` should be available after the command. These two options are optional.

##### Control with prompts

We should prompt the user to choose the repo name and confirm the full fork path.

The prompt should happens as soon as the user enters `mo fork` command, before cloning and forking operation.

Two questions:

1. Would you like to fork to an organization? (Default: N) (skip if `--org` option is provided)

If yes, prompt the user to enter the organization name, and add `--org` option to `gh repo fork`. If no, skip this question.

2. What is the repo name of the fork? (Skip if `--name` option is provided)

Provide two default values: the same as the original repo name(default), `${originalOwnerName}-${repoName}`. But also allow users to enter any repo name themselves.
