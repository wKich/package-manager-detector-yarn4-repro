// Minimal repro for package-manager-detector@1.9.0
// Environment: Node 24, real Yarn 4.13 (berry) via `yarn` (corepack, packageManager: yarn@4.13.0)
//
// Run: yarn repro
//
// The script deliberately does NOT set npm_config_user_agent itself; real Yarn 4.13
// provides it when it launches this script, exactly like it does for any
// `yarn run` / `yarn exec` child process (e.g. Playwright).

import { getUserAgent, detect } from 'package-manager-detector/detect'
import { resolveCommand } from 'package-manager-detector/commands'

const rawUserAgent = process.env.npm_config_user_agent
console.log(`npm_config_user_agent (set by the package manager): ${rawUserAgent}`)

if (!rawUserAgent) {
  console.error('\nERROR: npm_config_user_agent is not set. Run this via `yarn repro` so real Yarn 4.13 provides it.')
  process.exit(2)
}

if (!/^yarn\/4\./.test(rawUserAgent)) {
  console.error(`\nERROR: expected a real Yarn 4 user agent, got ${JSON.stringify(rawUserAgent)}. Run via \`yarn repro\`.`)
  process.exit(2)
}

// --- 1. getUserAgent() ignores the version in the user agent ---

const agent = getUserAgent()
console.log(`\ngetUserAgent(): ${JSON.stringify(agent)}`)
// actual (1.9.0):  'yarn' (classic)  <- BUG: yarn/4.* is berry
// expected:        'yarn@berry'

// Contrast: the lockfile-based detect() gets it right in the same environment.
const detected = await detect()
console.log(`detect() (lockfile strategy): ${JSON.stringify(detected)}`)
// 'yarn@berry' — shows the misdetection is isolated to the getUserAgent() fast path

// --- 2. classic template inserts a literal '--' before the script ---

const cmd = resolveCommand(agent, 'execute-local', ['playwright', 'test', '--list'])
console.log(`\nresolveCommand(${JSON.stringify(agent)}, 'execute-local', ['playwright', 'test', '--list'])`)
console.log(JSON.stringify(cmd))
// actual (1.9.0):  { command: 'yarn', args: ['exec', 'playwright', '--', 'test', '--list'] }
// expected:        { command: 'yarn', args: ['exec', 'playwright', 'test', '--list'] }

// --- assertions ---

const expectedAgent = 'yarn@berry'
const expectedCmd = { command: 'yarn', args: ['exec', 'playwright', 'test', '--list'] }

let failed = false

if (agent !== expectedAgent) {
  console.error(`FAIL getUserAgent(): got ${JSON.stringify(agent)}, expected ${JSON.stringify(expectedAgent)}`)
  failed = true
}

if (JSON.stringify(cmd) !== JSON.stringify(expectedCmd)) {
  console.error(`FAIL resolveCommand(): got ${JSON.stringify(cmd)}, expected ${JSON.stringify(expectedCmd)}`)
  failed = true
}

console.log(failed ? '\nREPRODUCED: bug present' : '\nOK: bug not present')
process.exit(failed ? 1 : 0)
