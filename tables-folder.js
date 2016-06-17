#!/usr/bin/env node

'use strict'

const handleTable = require('./index')

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
    let results = []
    for (let input of inputs) {
      const name = input.splice(0, 1)
      console.log(`Starting ${name}...`)
      console.time(`Handle ${name}`)
      results.push(Object.assign({name}, handleTable(...input)))
      console.timeEnd(`Handle ${name}`)
    }
    return Promise.all(results)
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
