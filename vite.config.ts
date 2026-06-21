import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { cli } from '@liangmi/vp-config'
import vue from '@vitejs/plugin-vue'

interface PackageJson {
  [key: string]: unknown
  name: string
  version: string
}

const repoRoot = resolve(import.meta.dirname)
const moiOutputDir = resolve(repoRoot, 'dist-moi')

export default cli({
  pack: {
    plugins: [vue()],
    entry: {
      mo: 'src/mo.ts',
      'mo-get-root': 'src/mo-get-root.ts',
      'mo-inner': 'src/mo-inner.ts'
    },
    hooks: {
      'build:done': buildMoiPackage
    }
  },
  run: {
    tasks: {
      cpack: {
        command: 'vp pack',
        input: ['!dist-moi/**']
      }
    }
  }
})

async function buildMoiPackage(): Promise<void> {
  const rootPackage = await readRootPackage()

  await rm(moiOutputDir, { recursive: true, force: true })
  await mkdir(resolve(moiOutputDir, 'bin'), { recursive: true })

  await cp(resolve(repoRoot, 'dist'), resolve(moiOutputDir, 'dist'), { recursive: true })
  await cp(resolve(repoRoot, 'config_schema.json'), resolve(moiOutputDir, 'config_schema.json'))
  await cp(resolve(repoRoot, 'LICENSE'), resolve(moiOutputDir, 'LICENSE'))
  await cp(resolve(repoRoot, 'packages/moi/README.md'), resolve(moiOutputDir, 'README.md'))

  await writeMoiBin('moi', 'mo')
  await writeMoiBin('moi-get-root', 'mo-get-root')
  await writeMoiBin('moi-inner', 'mo-inner')
  await writeMoiPackageJson(rootPackage)
}

async function readRootPackage(): Promise<PackageJson> {
  const content = await readFile(resolve(repoRoot, 'package.json'), 'utf8')
  return JSON.parse(content) as PackageJson
}

async function writeMoiBin(name: string, entry: string): Promise<void> {
  const content = ['#!/usr/bin/env node', `await import('../dist/${entry}.mjs')`, ''].join('\n')

  await writeFile(resolve(moiOutputDir, 'bin', `${name}.mjs`), content, { mode: 0o755 })
}

async function writeMoiPackageJson(rootPackage: PackageJson): Promise<void> {
  const packageJson: PackageJson = {
    ...rootPackage,
    bin: {
      moi: './bin/moi.mjs',
      'moi-get-root': './bin/moi-get-root.mjs',
      'moi-inner': './bin/moi-inner.mjs'
    },
    description: 'Alias package for @liangmi/mo using moi CLI names',
    files: ['dist', 'bin', 'config_schema.json', 'README.md', 'LICENSE'],
    name: '@liangmi/moi',
    type: 'module'
  }

  await writeFile(
    resolve(moiOutputDir, 'package.json'),
    `${JSON.stringify(packageJson, null, 2)}\n`
  )
}
