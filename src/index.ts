import { cac } from 'cac'
import packageJson from '../package.json'

const cli = cac('ghm')

cli.help()
cli.version(packageJson.version || '0.0.0')

cli.parse()
