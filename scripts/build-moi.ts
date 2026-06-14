import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

type PackageJson = {
  [key: string]: unknown
  name: string
  version: string
}

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const outputDir = resolve(repoRoot, 'dist-moi')

async function main(): Promise<void> {
  const rootPackage = await readRootPackage()

  await rm(outputDir, { recursive: true, force: true })
  await mkdir(resolve(outputDir, 'bin'), { recursive: true })

  await cp(resolve(repoRoot, 'dist'), resolve(outputDir, 'dist'), { recursive: true })
  await cp(resolve(repoRoot, 'config_schema.json'), resolve(outputDir, 'config_schema.json'))
  await cp(resolve(repoRoot, 'LICENSE'), resolve(outputDir, 'LICENSE'))
  await cp(resolve(repoRoot, 'packages/moi/README.md'), resolve(outputDir, 'README.md'))

  await writeBin('moi', 'mo')
  await writeBin('moi-get-root', 'mo-get-root')
  await writeBin('moi-inner', 'mo-inner')
  await writePackageJson(rootPackage)
}

async function readRootPackage(): Promise<PackageJson> {
  const content = await readFile(resolve(repoRoot, 'package.json'), 'utf8')
  return JSON.parse(content) as PackageJson
}

async function writeBin(name: string, entry: string): Promise<void> {
  const content = ['#!/usr/bin/env node', "'use strict'", `import '../dist/${entry}.mjs'`, ''].join(
    '\n',
  )

  await writeFile(resolve(outputDir, 'bin', `${name}.mjs`), content, { mode: 0o755 })
}

async function writePackageJson(rootPackage: PackageJson): Promise<void> {
  const packageJson: PackageJson = {
    ...rootPackage,
    bin: {
      moi: './bin/moi.mjs',
      'moi-get-root': './bin/moi-get-root.mjs',
      'moi-inner': './bin/moi-inner.mjs',
    },
    description: 'Alias package for @liangmi/mo using moi CLI names',
    files: ['dist', 'bin', 'config_schema.json', 'README.md', 'LICENSE'],
    name: '@liangmi/moi',
    type: 'module',
  }
  for (const key of [
    'devDependencies',
    'inlinedDependencies',
    'packageManager',
    'pnpm',
    'scripts',
  ]) {
    delete packageJson[key]
  }

  await writeFile(resolve(outputDir, 'package.json'), `${JSON.stringify(packageJson, null, 2)}\n`)
}

await main()
