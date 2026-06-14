import { readFile, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { resolve } from 'node:path'
import pc from 'picocolors'

const managedMarker = 'mo-dev-wrapper:managed'
const binDir = resolve(homedir(), '.local/bin')
const wrapperGroups = {
  mo: ['mo', 'mo-get-root', 'mo-inner'],
  moi: ['moi', 'moi-get-root', 'moi-inner'],
} as const
const wrapperNames = wrapperGroups[parseGroupName()]

function parseGroupName(): keyof typeof wrapperGroups {
  const input = process.argv[2]
  if (input === 'mo' || input === 'moi') {
    return input
  }

  console.error(pc.red('Usage: node scripts/uninstall.ts <mo|moi>'))
  process.exit(1)
}

async function removeIfManaged(name: string): Promise<void> {
  const target = resolve(binDir, name)
  if (!existsSync(target)) {
    console.log(pc.gray(`Skipped ${name}: not found at ${target}`))
    return
  }

  const content = await readFile(target, 'utf8')
  if (!content.includes(managedMarker)) {
    console.log(pc.yellow(`Skipped ${name}: ${target} is not managed by dev:i`))
    return
  }

  await rm(target)
  console.log(pc.green(`Removed ${name} wrapper at ${target}`))
}

async function main() {
  for (const name of wrapperNames) {
    await removeIfManaged(name)
  }
}

await main()
