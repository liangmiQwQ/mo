import { cac } from 'cac'
import packageJson from '../package.json'
import { loadConfig } from './config/config'

const cli = cac('ghm')

loadConfig()

cli.help()
cli.version(packageJson.version || '0.0.0')

cli.parse()
