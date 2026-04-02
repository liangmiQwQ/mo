import { defineConfig } from 'vite-plus'

export default defineConfig({
  staged: {
    '*': 'vp check --fix',
  },
  pack: {
    fixedExtension: true,
    platform: 'node',
    entry: {
      mo: 'src/mo.ts',
      'mo-inner': 'src/mo-inner.ts',
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
