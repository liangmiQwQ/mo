# RFC: `@liangmi/moi` package

There are some cli tools like [Mole CLI](https://github.com/tw93/Mole.git), which are already using `mo` as their cli entry, makes `@liangmi/mo` conflict with them.

In order to resolve this problem, we provide an alias package called `@liangmi/moi`, it uses `moi` as main cli entry. As well as `moi-inner`, `moi-get-root`.

We can modify runtime code, and use bundle-time env vars to implement it. `@liangmi/moi` should have its own README.md that reference to `@liangmi/mo` package and why this package is existing. The `package.json` and other metadata should be generated at buildtime.

We should keep `@liangmi/moi` is just an alias package, it should have the same version as `@liangmi/mo` controlled by CI.
