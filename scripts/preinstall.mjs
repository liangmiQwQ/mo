#!/usr/bin/env node
'use strict'
import path from 'node:path'
import fs from 'node:fs'
if (fs.existsSync(path.resolve(import.meta.dirname, '../dist/preinstall.mjs'))) {
  await import('../dist/preinstall.mjs')
}
