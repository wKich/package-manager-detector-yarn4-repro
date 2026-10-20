// Shows the real-world impact of the misdetection.
//
// With `getUserAgent() === 'yarn'` (classic), resolveCommand() inserts a literal
// '--' before the script:
//
//   yarn exec playwright -- test --list
//
// Real Yarn 4.13 forwards that literal '--' to the child process, and Playwright's
// CLI stops parsing the command: instead of running the `test` command with
// `--list`, it falls back to the default action and RUNS THE ENTIRE SUITE.
// No error, exit code 0 — a silent wrong result.
//
// Run: yarn repro:playwright

import { getUserAgent } from 'package-manager-detector/detect'
import { resolveCommand } from 'package-manager-detector/commands'
import { spawnSync } from 'node:child_process'

const agent = getUserAgent()

const buggy = resolveCommand(agent, 'execute-local', ['playwright', 'test', '--list'])
const expected = resolveCommand('yarn@berry', 'execute-local', ['playwright', 'test', '--list'])

function run({ command, args }) {
  const result = spawnSync(command, args, { encoding: 'utf8', shell: process.platform === 'win32' })
  return { status: result.status, output: (result.stdout + result.stderr).trim() }
}

console.log(`getUserAgent() = ${JSON.stringify(agent)}`)
console.log(`actual   command: ${buggy.command} ${buggy.args.join(' ')}`)
console.log(`expected command: ${expected.command} ${expected.args.join(' ')}\n`)

const actual = run(buggy)
console.log(`$ ${buggy.command} ${buggy.args.join(' ')}`)
console.log(actual.output)
console.log(`exit=${actual.status}`)

const looksLikeListing = /Listing tests:|Total:/i.test(actual.output)
if (!looksLikeListing) {
  console.error('\nFAIL: `--list` was ignored; the suite was executed instead of listed.')
  process.exit(1)
}

console.log('\nOK: tests were listed.')
