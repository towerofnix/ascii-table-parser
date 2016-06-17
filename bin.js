#!/usr/bin/env node

'use strict'

const handleTable = require('./index')

const fsp = require('fs-promise')
const yaml = require('js-yaml')

const args = process.argv.slice(2)

if (args.length === 2) {
  const tableFile = args[0]
  const rulesFile = args[1]
  const name = tableFile

  Promise.all([
    fsp.readFile(tableFile)
      .then(table => table.toString()),
    fsp.readFile(rulesFile)
      .then(rules => yaml.safeLoad(rules.toString()))
  ]).then(results => {
    const table = results[0]
    const rules = results[1]
    console.log(JSON.stringify(handleTable(table, rules), null, 2))
    process.exit(0)
  }).catch(e => {
    console.error(e.stack)
    process.exit(1)
  })
}
