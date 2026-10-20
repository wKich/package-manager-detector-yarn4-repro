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

## Affected versions

Not specific to 4.13.0 — reproduced on **every Yarn ≥ 2 version tested** (2.4.2, 4.0.2, 4.3.1, 4.5.0–4.7.0, 4.9.1–4.13.0, 4.18.0, 4.18.1), and version-independent by construction:

- `getUserAgent()` returns `userAgent.split('/')[0]`, discarding the version, so any `yarn/<version>` collapses to `'yarn'`.
- Yarn ≥ 2 always sets `npm_config_user_agent=yarn/<version> ...`, so berry is always misdetected; classic Yarn 1 also matches `'yarn'`, which is why the bare name cannot distinguish them.

Verified impact: Yarn 4.13.0 and 4.18.1 both forward the literal `--` to the child process, and the silent Playwright failure was reproduced end-to-end on 4.13.0.

Any version can be re-checked by changing `packageManager` in `package.json` and running `yarn repro`.

## Environment

- Node v24.13.0 (darwin arm64)
- Yarn 4.13.0 via corepack
- package-manager-detector 1.9.0 · @playwright/test 1.64.1

## Files

- `repro.mjs` — core assertions (`getUserAgent`, `resolveCommand`)
- `repro-playwright.mjs` — shows the real-world impact
- `echo-args.mjs` — raw argv probe: Yarn 4 forwards the literal `--` to the child
- `e2e/example.spec.mjs` — trivial test used by the demo
