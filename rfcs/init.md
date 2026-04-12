# RFC: init command

Stage Four adds `mo init` for initializing a local directory as a new GitHub repository.

## Motivation

When starting a new project, developers need to:

- Initialize git in a local directory
- Create a corresponding GitHub repository
- Set up remote configuration

`mo init` streamlines this workflow while maintaining the `mo` directory structure (`<root>/<owner>/<repo>`).

## Usage

```bash
mo init
mo i      # alias
```

The command must be run inside a directory that follows the `mo` directory structure: `<root>/<owner>/<repo>`.

## Behavior

1. **Validate location**: Verify current directory matches the pattern `<root>/<owner>/<repo>`. Exit with error if not.
2. **Extract repo info**: Parse owner and repo name from the directory path.
3. **Check owner**: Get authenticated GitHub username via `gh api user --jq '.login'`. Compare with owner from path to determine if `--org` flag is needed.
4. **Check existing state**:
   - If `.git` exists and has `origin` remote, exit with error (repo already initialized).
   - If `.git` exists without `origin`, skip git init step.
5. **Prompt for visibility**: Ask user to choose repository visibility (public/private). Default to public.
6. **Initialize git**: Run `git init` if not already a git repo.
7. **Create GitHub repo**:
   - Personal repo: `gh repo create <repo> --source=. --remote=origin`
   - Org repo: `gh repo create <repo> --org <owner> --source=. --remote=origin`
8. **Confirm success**: Print the created repository URL.

## Options

| Option      | Short | Description                                |
| ----------- | ----- | ------------------------------------------ |
| `--public`  |       | Create as public repository (skip prompt)  |
| `--private` |       | Create as private repository (skip prompt) |
| `--push`    | `-p`  | Push current branch after repo creation    |

## Aliases

| Alias | Command   |
| ----- | --------- |
| `i`   | `mo init` |

Additional per-user aliases can be configured in `morc.json` `alias.init`.

## Error Cases

- **Not in mo structure**: Current directory is not under `<root>/<owner>/<repo>`. Print error with expected structure.
- **Nested too deep**: Current directory is `<root>/<owner>/<repo>/subdir`. Suggest running from repo root.
- **Already has origin**: Repository already has `origin` remote configured. Suggest using `mo fork` for fork workflows.
- **GitHub repo exists**: `gh repo create` fails because repo already exists. Suggest `mo clone` instead.
- **No org access**: `gh repo create --org` fails because user doesn't have access. Let gh cli error propagate.

## Examples

```bash
# Create new project directory and initialize
mkdir -p ~/code/liangmiQwQ/my-project
cd ~/code/liangmiQwQ/my-project
mo init

# Initialize with options
mo init --private --push

# Using alias
mo i
```

## Implementation Notes

- Use `gh repo create` with `--source=.` to link local directory to new remote.
- The `--remote=origin` flag ensures consistent remote naming.
- If owner matches authenticated user, call `gh repo create <repo>`. Otherwise, call `gh repo create <repo> --org <owner>` and let gh handle access validation.
