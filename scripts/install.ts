import { chmod, mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import pc from 'picocolors'

const managedMarker = 'mo-dev-wrapper:managed'
const binDir = resolve(homedir(), '.local/bin')
const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const vpBin = resolve(repoRoot, 'node_modules/.bin/vp')
const entries = [
  { name: 'mo', bin: resolve(repoRoot, 'bin/mo.mjs') },
  { name: 'mo-get-root', bin: resolve(repoRoot, 'bin/mo-get-root.mjs') },
  { name: 'mo-inner', bin: resolve(repoRoot, 'bin/mo-inner.mjs') },
  { name: 'moi', bin: resolve(repoRoot, 'dist-moi/bin/moi.mjs') },
  { name: 'moi-get-root', bin: resolve(repoRoot, 'dist-moi/bin/moi-get-root.mjs') },
  { name: 'moi-inner', bin: resolve(repoRoot, 'dist-moi/bin/moi-inner.mjs') },
]

function shellQuote(input: string): string {
  return `'${input.replace(/'/g, `'"'"'`)}'`
}

function isPathContains(pathname: string): boolean {
  const pathValue = process.env.PATH ?? ''
  return pathValue.split(':').includes(pathname)
}

function createWrapperContent(binPath: string): string {
  return [
    '#!/usr/bin/env sh',
    `# ${managedMarker}`,
    `case "$PWD" in ${shellQuote(repoRoot)}|${shellQuote(repoRoot)}/*) ;;`,
    `*) echo ${shellQuote(`mo dev wrapper can only run inside ${repoRoot}`)} >&2; exit 78 ;;`,
    'esac',
    `(cd ${shellQuote(repoRoot)} && ${shellQuote(vpBin)} pack --logLevel silent >/dev/null && node scripts/build-moi.ts) || exit $?`,
    `exec node ${shellQuote(binPath)} "$@"`,
    '',
  ].join('\n')
}

async function installWrapper(name: string, binPath: string): Promise<void> {
  const target = resolve(binDir, name)
  await writeFile(target, createWrapperContent(binPath), 'utf8')
  await chmod(target, 0o755)
  console.log(pc.green(`Installed ${name} -> ${target}`))
}

async function main() {
  if (!existsSync(vpBin)) {
    console.error(pc.red(`Missing ${basename(vpBin)} at ${vpBin}. Run "vp install" first.`))
    process.exit(1)
  }

  await mkdir(binDir, { recursive: true })
  for (const item of entries) {
    await installWrapper(item.name, item.bin)
  }

  if (!isPathContains(binDir)) {
    console.log(
      pc.yellow(`Add ${binDir} to PATH so mo and moi dev wrappers are available in new shells.`),
    )
  }
}

await main()
