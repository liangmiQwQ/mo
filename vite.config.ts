import { defineConfig } from 'vite-plus'

export default defineConfig({
  staged: {
    '*': 'vp check --fix',
  },
  pack: {
    fixedExtension: true,
    platform: 'node',
    entry: {
      cli: 'src/cli.ts',
    },
    dts: false,
    exports: false,
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {
    singleQuote: true,
    semi: false,
    sortPackageJson: true,
  },
  test: {
    exclude: ['.root/**', 'node_modules/**'],
    fileParallelism: false,
  },
})
