import pc from 'picocolors'
import type { GlobalUserConfig } from '../utils/config'
import { icons, toTildePath } from '../utils/format'
import { scanRepos } from '../utils/repos'

export async function runListCommand(config: GlobalUserConfig): Promise<void> {
  const groups = await scanRepos(config.root)

  if (!groups.length) {
    printNoRepositoriesFound(config.root)
    return
  }

  const displayRoot = toTildePath(config.root)
  console.log(`${pc.gray(`Projects in`)} ${pc.cyan(displayRoot)}`)
  console.log()

  let totalRepos = 0
  for (const group of groups) {
    const repos = group.repos.map((r) => r.name).sort()
    totalRepos += repos.length
    console.log(`${pc.bold(group.owner)} ${pc.dim(`(${repos.length})`)}`)

    for (const repo of repos) {
      console.log(`${pc.dim(` - `)}${repo}`)
    }

    console.log()
  }

  const totalOwners = groups.length
  console.log(
    `${pc.dim('Found')} ${pc.cyan(totalRepos.toString())} ${pc.dim(`repositor${totalRepos === 1 ? 'y' : 'ies'} in`)} ${pc.cyan(totalOwners.toString())} ${pc.dim(`organization${totalOwners === 1 ? '' : 's'}`)}`,
  )
}

function printNoRepositoriesFound(root: string): void {
  console.log(`${icons.warning} ${pc.yellow(`No repositories found under ${pc.cyan(root)}`)}`)
}
