# RFC: Fork and Remote Control

Stage Four adds `mo fork` for forking GitHub repos and a set of subcommands for managing git remotes within the `mo` directory structure.

The design is not finalized. Contributions and discussion are welcome via GitHub issues.

## Motivation

Open source contributors frequently need to:

- Fork an upstream repo and clone the fork to the local code root.
- Keep `upstream` and `origin` remotes in sync with the expected `mo` directory layout.
- Switch between different remote configurations without leaving the `mo` workflow.

## Proposed Commands

These are early sketches and subject to change.

### `mo fork`

```bash
mo fork <user>/<repo>
```

Forks `<user>/<repo>` on GitHub via `gh repo fork`, then clones the fork to `<root>/<user>/<repo>` with an `upstream` remote pointing at the original.

### `mo remote`

Subcommands for inspecting and managing remotes of repos inside the code root.

Details TBD.

## Open Questions

- Should `mo fork` clone to `<original-owner>/<repo>` or `<authenticated-user>/<repo>`?
- How to handle repos already cloned without the upstream remote?
- Does `mo remote` expose `git remote` directly, or add higher-level helpers?
