---
name: contributing-to-open-source
description: Standardize GitHub open-source contribution work by using mo or moi to create or reuse a fork, preserve upstream and origin remotes, work on a dedicated branch, validate changes, and prepare a pull request. Use when Codex is asked to modify a GitHub repository the user does not maintain, fix an upstream issue, contribute a patch, or submit a pull request from a fork.
---

# Contribute to Open Source

Follow the target repository's contribution instructions first. Use `moi`(try first) or `mo` to prepare the repository, then use normal development tools inside its local directory.

## Respect the Contribution Boundary

- Do not fork for read-only inspection, explanation, diagnosis, or local experiments.
- Treat a request to implement and submit an upstream contribution as permission to create the required fork. Otherwise, get permission before running `mo fork` because it changes GitHub state.
- Reuse a healthy existing fork instead of creating another one.
- Never push to `upstream`. Push contribution branches to `origin`.
- Preserve uncommitted work, existing branches, and remotes. Do not force-push unless the user explicitly requests it.

## Select the Project CLI

Identify the installed CLI by its paired root resolver:

```bash
if command -v moi-get-root >/dev/null 2>&1; then
  moi-get-root
elif command -v mo-get-root >/dev/null 2>&1; then
  mo-get-root
else
  echo "Install @liangmi/moi or @liangmi/mo before preparing the contribution." >&2
  exit 1
fi
```

Use `moi` when `moi-get-root` succeeds and `mo` when `mo-get-root` succeeds. Never select the CLI from the `mo` executable alone because another program may own that command.

The resolver prints JSON containing the configured code root as `rootPath`. Managed repositories use:

```text
<rootPath>/<upstream-owner>/<repo>
```

Run `moi setup` or `mo setup` when the selected CLI has no default configuration.

## Prepare the Fork

Inspect the expected local path and its Git state before running a mutating command:

```bash
git status --short --branch
git remote -v
git branch --show-current
```

Choose the preparation path:

1. If the repository is absent, run the selected CLI with the upstream repository:

   ```bash
   mo fork <upstream-owner>/<repo>
   ```

2. If a managed local clone has `origin` pointing to upstream and has no `upstream` remote, run `mo fork` from the repository root to convert it in place:

   ```bash
   mo fork
   ```

3. If `upstream` points to the source repository and `origin` points to the user's fork, reuse the repository without running `mo fork`.

4. If the path, remotes, or working tree conflict with these cases, stop and resolve the ambiguity without deleting or overwriting user data.

The repo argument may also be a GitHub URL. Use `--org <org>` only when the user intends to own the fork through that organization, and use `--name <name>` only when a renamed fork is intentional:

```bash
mo fork vitejs/vite --org my-org
mo fork vitejs/vite --name my-vite
```

Without those options, accept the interactive defaults for a personal fork with the original repository name unless the user requests something else. Substitute `moi` for every example when its resolver selected `moi`.

After a successful fork, verify:

```text
upstream -> original GitHub repository
origin   -> user's GitHub fork
path     -> <rootPath>/<upstream-owner>/<repo>
```

`mo fork` also makes the local default branch track the upstream default branch.

## Create the Contribution

1. Read `AGENTS.md`, `CONTRIBUTING.md`, the issue or request, and relevant project documentation.
2. Confirm the default branch is clean, fetch `upstream`, and fast-forward it before branching.
3. Create a focused contribution branch from the upstream default branch. Follow the target project's branch naming rules.
4. Make the smallest complete change and follow the target project's code, test, and documentation conventions.
5. Run the relevant validation and inspect the final diff for unrelated changes.
6. Commit with the target project's commit convention.
7. Push the contribution branch to `origin`, never `upstream`.
8. Open the pull request against the upstream repository and its default branch. Follow its PR template, link the relevant issue, describe user-visible behavior, and allow maintainer edits.

Keep the fork relationship explicit when creating the pull request:

```text
base repository: <upstream-owner>/<repo>
base branch:     <upstream-default-branch>
head repository: <fork-owner>/<fork-name>
head branch:      <contribution-branch>
```

Report the local path, branch, validation result, and pull request URL when finished.
