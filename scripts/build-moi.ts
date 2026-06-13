import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

type PackageJson = {
  version: string
  license?: string
  author?: string
  homepage?: string
  bugs?: unknown
  repository?: unknown
  dependencies?: Record<string, string>
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

  await writeBin('moi', 'mo')
  await writeBin('moi-get-root', 'mo-get-root')
  await writeBin('moi-inner', 'mo-inner')
  await writePackageJson(rootPackage)
  await writeReadme()
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
  const packageJson = {
    name: '@liangmi/moi',
    version: rootPackage.version,
    description: 'Alias package for @liangmi/mo using moi CLI names',
    homepage: rootPackage.homepage,
    bugs: rootPackage.bugs,
    license: rootPackage.license,
    author: rootPackage.author,
    repository: rootPackage.repository,
    bin: {
      moi: './bin/moi.mjs',
      'moi-get-root': './bin/moi-get-root.mjs',
      'moi-inner': './bin/moi-inner.mjs',
    },
    files: ['dist', 'bin', 'config_schema.json', 'README.md', 'LICENSE'],
    type: 'module',
    exports: {
      './package.json': './package.json',
    },
    publishConfig: {
      access: 'public',
    },
    dependencies: rootPackage.dependencies,
  }

  await writeFile(resolve(outputDir, 'package.json'), `${JSON.stringify(packageJson, null, 2)}\n`)
}

async function writeReadme(): Promise<void> {
  const readme = `# moi

\`@liangmi/moi\` is an alias package for [\`@liangmi/mo\`](https://www.npmjs.com/package/@liangmi/mo).

It exists for users who already have another \`mo\` command installed. The runtime behavior is the same as \`@liangmi/mo\`, but the command names are \`moi\`, \`moi-inner\`, and \`moi-get-root\`.

## Install

\`\`\`bash
vp i -g @liangmi/moi
\`\`\`

## Setup

\`\`\`bash
moi setup
\`\`\`

See the [mo README](https://github.com/liangmiQwQ/mo#readme) for full usage.
`

  await writeFile(resolve(outputDir, 'README.md'), readme)
}

await main()
