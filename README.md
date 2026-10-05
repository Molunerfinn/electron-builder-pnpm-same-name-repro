# electron-builder pnpm collector: app name equal to a dependency name drops production deps

Minimal reproduction for an electron-builder bug: when a pnpm project's own `package.json` `name` is the same as one of its production dependencies, the pnpm node-module collector reads that dependency's `package.json` as if it were the app's, and most of the app's production dependencies are silently left out of `app.asar`.

Real-world impact: [PicGo](https://github.com/Molunerfinn/PicGo) (app name `picgo`, depends on the `picgo` core library) ships an `app.asar` that contains only the core library's dependencies — `picgo` itself and dozens of app dependencies are missing, so the packaged app crashes on startup with `Cannot find module`.

## Setup

- `package.json` `name` is `debug`
- production dependencies: `debug@4.4.1` (which depends on `ms`), `lodash`, `ms`
- pnpm `10.29.2` (pinned via `packageManager`), electron-builder `26.17.0`

## Steps

```bash
pnpm install
pnpm run dist     # electron-builder --dir
pnpm run verify   # lists node_modules packed into app.asar
```

## Expected

```
packed node_modules: debug, lodash, ms
OK: all expected deps are packed
```

## Actual

```
packed node_modules: ms
MISSING: debug, lodash
```

## Affected versions

| electron-builder | result |
|---|---|
| 26.1.0 – 26.13.0 | OK |
| 26.13.1, 26.14.0, 26.15.0, 26.15.7, 26.16.1, 26.17.0 | deps missing |

Renaming the root package (e.g. to `debug-app`) makes the problem go away.

## Analysis

1. `PnpmNodeModulesCollector.extractProductionDependencyGraph()` handles the root node with `locateFromDepOrRoot(tree.name, tree.path, tree.version)`, i.e. `locateFromDepOrRoot("debug", <projectDir>, "1.0.0")`.
2. No `debug` satisfies `1.0.0`, so it reaches the override fallback (added in #9804, released in 26.13.1) that accepts an out-of-range copy, and returns `<projectDir>/node_modules/debug` (`debug@4.4.1`) instead of the project itself.
3. The root's `all` map is therefore built from **debug@4.4.1's** `package.json` (`{ ms }`), and `if (!all[packageName]) return undefined` drops every app dependency except `ms`.
4. `collectionMatchesAppDependencies()` in `appFileCopier` only checks `requiredExternalDeps.some(...)`, so as soon as one app dependency (`ms`) happens to be in the wrong collection, it is accepted and the `traversal` fallback never runs. (Without the direct `ms` dependency the collection matches nothing, electron-builder falls back to traversal, and the output happens to be correct — which is why this is easy to miss.)

Possible fixes: resolve the root node from `tree.path`/`rootDir` directly instead of looking it up by name, and/or require every declared production dependency (not `.some`) in `collectionMatchesAppDependencies`.
