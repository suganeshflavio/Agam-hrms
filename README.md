# agam-hrms

## Backend (Core HRMS)

The UI talks to the Core HRMS Rails API (`../core_hrms`). All data access goes through
`src/redux/api/hrmsApi.ts`, which calls `/api/v1/app/*` via `src/services/apiClient.ts`.

```sh
# in ../core_hrms
docker compose up -d && bin/rails db:prepare && bin/rails hrms:demo:agam && bin/rails server
# here
cp .env.example .env   # proxy target for the Rails API
npm run dev
```

Log in with `priya.sharma@agam.internal` / `Password@2026` (or the demo buttons).

- All data comes from the backend; there is no offline/mock mode.
- Sessions refresh automatically; a 401 returns to the login screen.
- The role switcher in the header only previews the UI — the backend enforces the user's real permissions.
- Zoho sign-in: the code is exchanged by the backend (`ZOHO_CLIENT_SECRET` lives there). Do not put a client secret in `VITE_*` variables — they are bundled into the browser.

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

This project replaces its workspace TypeScript package with [typescript-native-bridge](https://github.com/johnsoncodehk/typescript-native-bridge). Command-line tools use the bridge automatically. To use it in VS Code after installing dependencies, accept the prompt to use the workspace TypeScript version. If the prompt does not appear, run **TypeScript: Select TypeScript Version** and choose **Use Workspace Version**.

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Run Unit Tests with [Vitest](https://vitest.dev/)

```sh
npm run test:unit
```

### Run End-to-End Tests with [Playwright](https://playwright.dev)

```sh
# Install browsers for the first run
npx playwright install

# When testing on CI, must build the project first
npm run build

# Runs the end-to-end tests
npm run test:e2e
# Runs the tests only on Chromium
npm run test:e2e -- --project=chromium
# Runs the tests of a specific file
npm run test:e2e -- tests/example.spec.ts
# Runs the tests in debug mode
npm run test:e2e -- --debug
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```
