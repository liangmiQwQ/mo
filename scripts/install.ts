import { chmod, mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import pc from 'picocolors'

const managedMarker = 'ghm-dev-wrapper:managed'
const binDir = resolve(homedir(), '.local/bin')
const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const tsxBin = resolve(repoRoot, 'node_modules/.bin/tsx')
const entries = [
  { name: 'ghm', entry: resolve(repoRoot, 'src/ghm.ts') },
  { name: 'ghmi', entry: resolve(repoRoot, 'src/ghmi.ts') },
]

function shellQuote(input: string): string {
  return `'${input.replace(/'/g, `'"'"'`)}'`
}

function isPathContains(pathname: string): boolean {
  const pathValue = process.env.PATH ?? ''
  return pathValue.split(':').includes(pathname)
}

function createWrapperContent(entryPath: string): string {
  return [
    '#!/usr/bin/env sh',
    `# ${managedMarker}`,
    `exec ${shellQuote(tsxBin)} ${shellQuote(entryPath)} "$@"`,
    '',
  ].join('\n')
}

async function installWrapper(name: string, entryPath: string): Promise<void> {
  const target = resolve(binDir, name)
  await writeFile(target, createWrapperContent(entryPath), 'utf8')
  await chmod(target, 0o755)
  console.log(pc.green(`Installed ${name} -> ${target}`))
}

async function main() {
  if (!existsSync(tsxBin)) {
    console.error(pc.red(`Missing ${basename(tsxBin)} at ${tsxBin}. Run "vp install" first.`))
    process.exit(1)
  }

  await mkdir(binDir, { recursive: true })
  for (const item of entries) {
    await installWrapper(item.name, item.entry)
  }

  if (!isPathContains(binDir)) {
    console.log(pc.yellow(`Add ${binDir} to PATH so "ghm" and "ghmi" are available in new shells.`))
  }
}

await main()
