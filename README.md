# package-manager-detector: Yarn 4 misdetected as classic yarn

Minimal repro for [`package-manager-detector@1.9.0`](https://github.com/antfu-collective/package-manager-detector):
inside a real Yarn 4 (berry) project, `getUserAgent()` reports classic `yarn`, and `resolveCommand()` then inserts a literal `--` that Yarn 4 forwards to the child process.

## Run

```sh
yarn install            # Yarn 4.13.0, pinned via packageManager
yarn repro              # assertions; exits 1 while the bug is present
yarn repro:playwright   # end-user impact demo with the real Playwright CLI
```

If `yarn` is not on your `PATH`: `corepack enable`.

## Actual vs expected

Real user agent, as set by Yarn 4.13: `yarn/4.13.0 npm/? node/v24.13.0 darwin arm64`

```js
getUserAgent()
// actual:   'yarn'                                    expected: 'yarn@berry'

resolveCommand(getUserAgent(), 'execute-local', ['playwright', 'test', '--list'])
// actual:   { command: 'yarn', args: ['exec', 'playwright', '--', 'test', '--list'] }
// expected: { command: 'yarn', args: ['exec', 'playwright', 'test', '--list'] }
```

Impact: the stray `--` reaches Playwright, which stops parsing `--list` and **runs the entire suite instead of listing tests** — exit code 0, no error, silently wrong result.

In the same environment, lockfile-based `detect()` correctly returns `yarn@berry`, so only the `getUserAgent()` fast path is wrong.

## Environment

- Node v24.13.0 (darwin arm64)
- Yarn 4.13.0 via corepack
- package-manager-detector 1.9.0 · @playwright/test 1.64.1

## Files

- `repro.mjs` — core assertions (`getUserAgent`, `resolveCommand`)
- `repro-playwright.mjs` — shows the real-world impact
- `echo-args.mjs` — raw argv probe: Yarn 4 forwards the literal `--` to the child
- `e2e/example.spec.mjs` — trivial test used by the demo
