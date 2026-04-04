There are some problems on the current implementation of `mo cd`

The current output

```
? Where would you like to go?
❯ .
 ──────────────
 antfu-collective
  .
  ni
 ──────────────
 liang-demos
  .
  oxc-typecheck-reproduction
  oxlint-oxfmt-demo
```

First, we should remove the ugly `──────────────` separator. Just use a blank line to separate the groups. Also remove it on search mode.

Also, we should gray unselected items.

And the <root> set in config should also be display as `<root>`, not `.`

And we can make some tips for the users while selecting like printing the path of the selected repository in the footer. (use ~ to represent /Users/xxx)

### List mode specific issues

The dots is also ugly, we should just allow users to select owner name directly.

And about the `sticky` owner name, we should only sticky when the owner name is scrolled out of view.

Users should also be able to clear the search by escape. Escape pressing if no search term is present should exit the selection mode.
