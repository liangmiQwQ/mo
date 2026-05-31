import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite-plus'

export default defineConfig({
  staged: {
    '*': 'vp check --fix',
  },
  pack: {
    plugins: [vue()],
    fixedExtension: true,
    platform: 'node',
    entry: {
      mo: 'src/mo.ts',
      'mo-get-root': 'src/mo-get-root.ts',
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
})
