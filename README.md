## Unified DIDComm UI-Triggered Test System

All tests in this project are UI-triggered and require the custom browser environment with DIDComm APIs. Tests cannot be run headlessly; use the app UI.

### How to run tests
1) Install dependencies:
```bash
npm install
```
2) Start the dev server:
```bash
npm run dev
```
3) Open the application in the custom DIDComm-enabled browser and navigate to the “All Tests” tab.

### Test categories
- Core DIDComm Tests: pack/unpack, getDID, basic messaging
- Permissions & Security: permission APIs, core security checks, ODB-related validations
- Protocol Tests: discover-features, attachments, protocol edge cases
- SDK Component Tests: client, service-worker, protocols, utils
- Converted Suites: wrappers of the newer vitest-style UI tests

Use “Run All” for a category or click individual test buttons. Results are shown inline with copy capability.

### Requirements
- Tests require the custom browser with DIDComm APIs and service worker support. Standard browsers will fail.
- `npm test` is not used for these UI tests; they are designed to run via the app UI only.

### Multi-peer scenarios
Some discovery/divergence tests work best with two peers.
- Terminal 1:
```bash
npm run dev
```
- Terminal 2:
```bash
npm run dev -- --port 3001
```
Then open both instances in the custom browser.