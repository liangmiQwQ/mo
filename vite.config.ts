import { defineConfig } from 'vite-plus'

export default defineConfig({
  staged: {
    '*': 'vp check --fix',
  },
  pack: {
    fixedExtension: true,
    platform: 'node',
    entry: {
      index: 'src/index.ts',
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
})
