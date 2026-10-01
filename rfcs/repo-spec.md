# RFC: Repository Spec Resolver

Every command that takes a repository resolves it to a `<owner>/<repo>` spec first. This RFC defines how that spec is found, so `clone`, `fork`, `composition`, `cd`, `edit`, and `open` behave the same way.

## Motivation

Users rarely type a clean `<owner>/<repo>`. They copy whatever is in front of them: a pull request link, a file link, an SSH remote, a URL without `https://`, or a whole sentence from a chat message. Today these inputs are rejected, and users have to trim them by hand.

The resolver should find the repository in these inputs and treat it as a spec.

## Accepted Forms

All of the following resolve to `vuejs/core`.

Exact specs:

```bash
vuejs/core
vuejs/core#123                                  # issue or pull request suffix
```

GitHub URLs, with or without a scheme:

```bash
https://github.com/vuejs/core
https://github.com/vuejs/core.git
git+https://github.com/vuejs/core.git
github.com/vuejs/core
www.github.com/vuejs/core
```

Deep links. Any path after `<owner>/<repo>`, query string, or hash is ignored:

```bash
https://github.com/vuejs/core/pull/123
https://github.com/vuejs/core/issues/123#issuecomment-1
https://github.com/vuejs/core/tree/main/packages/runtime-core
https://github.com/vuejs/core/blob/main/README.md?plain=1
```

SSH remotes:

```bash
git@github.com:vuejs/core.git
ssh://git@github.com/vuejs/core.git
```

Text that contains one of the forms above:

```bash
"see https://github.com/vuejs/core/pull/123, it fixes the bug"
"[core](https://github.com/vuejs/core)"
"<https://github.com/vuejs/core>"
"try vuejs/core."
```

## Resolution Rules

1. Trim the input. An empty input has no spec.
2. If the whole input is an exact spec or a GitHub URL, use it.
3. Otherwise, scan the text for the first GitHub URL (any of the URL or SSH forms above) and use it.
4. Otherwise, scan the text for the first standalone `<owner>/<repo>` token and use it.
5. Otherwise, there is no spec.

A URL found in the text always wins over a bare `<owner>/<repo>` token, even when the token comes first, because a URL is much less likely to be a false match.

A standalone token is separated from the rest of the text by whitespace, quotes, brackets, or trailing punctuation (`.`, `,`, `:`, `;`, `!`, `?`). A token with more than two path segments, such as `src/utils/github.ts`, is not a spec.

URLs of other hosts are never resolved, and their path is never read as a bare token. For example, `https://gitlab.com/vuejs/core` has no spec.

Owner and repo names are validated with GitHub's rules: the owner is alphanumeric with single inner hyphens, and the repo name is made of alphanumerics, `.`, `_`, and `-`. A `.git` suffix is removed from the repo name.

`.` is not a spec. Commands that accept `.` handle it before calling the resolver.

## Command Behavior

### `clone`, `fork`, `composition`

These commands need a remote repository, so the resolved spec is the target.

If the input is not an exact spec, the command prints the resolved spec before doing anything else, so users can see what was picked:

```bash
$ mo clone "https://github.com/vuejs/core/pull/123"
Resolved vuejs/core
```

If no spec is found, the command fails with the current error:

```
Invalid repository format. Use <owner>/<repo> or a GitHub repository URL.
```

### `cd`, `edit`, `open`

These commands accept search queries too, and `<owner>/<repo>` prefix search (`mo cd vue/co`) must keep working. So the resolver is only one of the steps:

1. `.` resolves the current managed project.
2. If the whole input is an exact spec or a GitHub URL, and `<root>/<owner>/<repo>` exists, use it.
3. Search local repositories and owners with the raw input, as before.
4. If the search has no match, resolve a spec from the text with the rules above. If `<root>/<owner>/<repo>` exists, use it.
5. Otherwise, the command fails as before.

It means that `mo cd https://github.com/vuejs/core/pull/123` jumps to `<root>/vuejs/core`. It doesn't mean that `mo cd vue/co` is treated as the literal repo `vue/co`, because the local search runs before free-text resolution.
