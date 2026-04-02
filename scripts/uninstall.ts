import { readFile, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { resolve } from 'node:path'
import pc from 'picocolors'

const managedMarker = 'ghm-dev-wrapper:managed'
const binDir = resolve(homedir(), '.local/bin')
const wrapperNames = ['ghm', 'ghmi']

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
