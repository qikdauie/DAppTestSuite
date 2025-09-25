# DIDComm Test Suite

A comprehensive testing suite for DIDComm v2 functionality using the `decent_app_sdk`.

## Overview

This test suite provides a React-based interface for testing various DIDComm v2 capabilities including:
- Message packing and unpacking
- App intents protocol
- Feature discovery protocol  
- Protocol permissions
- Security testing
- Adversarial attack scenarios

## Architecture

The test suite uses the production-ready `decent_app_sdk` which provides:
- Complete service worker management
- Built-in DIDComm protocols (discover-features, app-intents)
- Robust message handling and RPC communication
- Comprehensive permissions management
- Enhanced security features

## Setup

1. Install dependencies:
```bash
npm install
```

2. The `decent_app_sdk` is included as a local file dependency, simulating git submodule behavior

3. Start the development server:
```bash
npm run dev
```

## Testing

The test suite includes comprehensive tests for:
- Pack/unpack message operations
- App intents (share, pick file, compose email, etc.)
- Feature discovery
- Protocol permissions
- Security and adversarial scenarios

All tests use the new SDK's clean, consistent API while preserving the original test logic and validation.

## Migration Notes

This test suite has been migrated from a custom embedded SDK to use the production-ready `decent_app_sdk`. The migration:
- Removed all custom SDK implementations
- Replaced custom service worker with SDK's `initServiceWorker()`
- Updated all test files to use the new SDK API
- Preserved all existing test functionality and UI

## Development

The test suite maintains the same user interface and testing capabilities while leveraging the improved SDK architecture for better reliability and maintainability.

### Running two instances for multi-peer tests

Some divergence and provider discovery tests expect two peers running simultaneously.

- Terminal 1:
```bash
npm run dev
```
This starts on port 3000.

- Terminal 2:
```bash
npm run dev -- --port 3001
```
This starts a second instance on port 3001.

Optional convenience script:

Add the following to `package.json` scripts to quickly launch a second dev server:

```json
"dev:3001": "vite --port 3001"
```