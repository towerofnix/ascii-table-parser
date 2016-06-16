#!/usr/bin/env node

// as usual, run with Node 6+
// `nvm use 6`
// Node 6 is cool :)

'use strict'

const fsp = require('fs-promise')
const yaml = require('js-yaml')

fsp.readdir('tables')
  .then(names => (
    names
      .filter(name => name.endsWith('.txt'))
      .map(tableName => tableName.slice(0, -4))
  ))
  .then(tables => {
    let promises = []
    for (let table of tables) {
      promises.push(Promise.resolve(table))
      promises.push(fsp.readFile(`tables/${table}.txt`))
      promises.push(fsp.readFile(`tables/${table}.rules.yaml`))
    }
    return Promise.all(promises)
  })
  .then(buffers => buffers.map(buffer => buffer.toString()))
  .then(results => {
    const newResults = []
    for (let i = 0; i < results.length; i += 3) {
      let name = results[i]
      let tableData = results[i + 1]
      let tableRules = yaml.safeLoad(results[i + 2])
      newResults.push([name, tableData, tableRules])
    }
    return newResults
  })
  .then(inputs => {
    return inputs.map(input => handle(...input))
  })
  .then(outputs => {
    const promises = []
    for (let output of outputs) {
      const name = output.name
      const templated = output.templated
      const write = JSON.stringify(templated, null, 2)
      promises.push(fsp.writeFile(`output/${name}.json`, write))
    }
    return Promise.all(promises)
  })
  .catch(e => console.error(e.stack))

function handle(name, contents, rules) {
  const tables = contents.split(rules.tableSplit)
  const out = []
  for (let table of tables) {
    // Extract data
    const data = {}
    for (const dataName in rules.getData) {
      const dataMatcher = rules.getData[dataName]
      const testString = ('line' in dataMatcher)
        ? table.split('\n')[dataMatcher.line - 1]
        : table
      const re = new RegExp(dataMatcher.regex)
      const matches = testString.match(re)
      let match
      if (matches === null) {
        // handle null
        match = '((Failed to match anything))'
      } else {
        match = matches['group' in dataMatcher ? dataMatcher.group : 0]
      }
      data[dataName] = match
    }

    // Template template template!
    const template = rules.template
    out.push(template
      .replace(/\$\(([^)]+)\)/g, function(_, dataName) {
        return data[dataName]
      }))
  }
  return {name: name, templated: out}
}
