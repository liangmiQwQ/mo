# RFC: Selector UI

The selector ui should be a easy-use ui for users to select a project. It is similar to the selector of `@inquirer/prompts`, but we should build it ourselves with Ink and React because of the custom featrures.

The TUI composition:

Core state: `"list" | "search" | "succeed" | "error"`

- Header: A single line, which includes an icon to show status, a text (question), and a blank for user input.
  The icon should be `?` if users is in list or search mode, `format.ts/icons.success` if succeed, `format.ts/icons.error` if error.
  The text should be "Where would you like to go? ", it should be bold.
  The input field should be a blank for user input.

  This Header should always be display. And the status of it can be updated. Like **when user press esc or ctrl + c, the icon should be replaced and the text and blank area should be replaced as error message. (got into error mode)** When succeed, the icon should also be replaced and the blank area should be replaced to the selected path (e.g. `~/code/ni`).

- Selector: The core selector, with a `❯` as a pointer and a list of selectable projects.

  The selector has two modes: list mode and search mode. The default mode is list mode. The user can switch to search mode by typing something in the input field.

  The unselected projects' name should always be default format. The selected one should be underlined and green.

  The pointer should be on the first item selectable by default. Keep its position at the middle of the list (And allow its position to be moved at the top or bottom of the list when scrolling)

  List mode: It is a classified list of projects. It has a certain height (up to you to decide) and it never changes no matter how users scroll.

  The entire list is composed of different groups. Each group is a list of projects. The first group is a one-item `<root>` group and the rest of the groups are divided by owner name. There's a blank line (unselectable) between each group.

  The owner name should be displayed at the top of each group (except the `<root>` group) with cyan bold, it also can be selected. No prefix or suffix should be added to the owner name / project name.

  The owner name should be sticky at top when the user is scrolling the owner name out of the view, **until the user's second scroll after the last project of the group is scrolled out of the view.** This step may need to change the selector's height to avoid ui shaking and **keep user's pointer from moving.**

  Search mode: Render two lists with search algorithm, can search in both project name and owner name. Highlight the matched characters (bold and green). A blank line should be added between the two lists.

  The first lists is about the projects. Project name in default style by default. Add a dim suffix `(owner name)` to the project name.

  The second list is about the owners. Owner name in dim by default. Owners related to the projects searched should also be adden in this list. (e.g. if user search `core`, then `vuejs` should be added to this list, even if no characters matched), but this cannot be reversed. (e.g. searching `vuejs` should not make `core` added in project list)

  It should be hidden in succeed and error mode.

- Footer: The footer is a line of text, and it has only two status
  If the user's pointer is on a valid path, it should display the path of the project. (dim the prefix and gray style the path)
  If the user's pointer is on nothing, it should display the message that no directory found with dim and italic format

  It should be hidden in succeed and error mode.

```bash
$ mo cd

? Where would you like to go?
❯ <root>

  antfu-collective
  ni

  liangmiQwQ
  oxc-typecheck-reproduction
  oxlint-oxfmt-demo
  pnpm-demo

Path: ~/code
```

```bash
$ mo cd

? Where would you like to go? ni
❯ ni (antfu-collective)

  antfu-collective

Path: ~/code/antfu-collective/ni
```
