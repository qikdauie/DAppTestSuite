import { getReadyDecentClient } from 'decent_app_sdk';
import { packMessageTest } from '../core/packMessage.js';
import { unpackMessageTest } from '../core/unpackMessage.js';
import { discoverFeaturesTest } from '../protocols/discoverFeatures.js';
import { messageThreadingTests } from '../core/messageThreading.js';
import { ensureSDKReady } from './environment-utils.js';
import { createPermissionHelpers } from '../../../submodules/decent_app_sdk/src/client/permissions.js';
import { createProtocolHelpers } from '../../../submodules/decent_app_sdk/src/client/protocols.js';

function aggregate(results) {
  const entries = Object.entries(results);
  const pass = entries.every(([, r]) => r && r.pass === true);
  return { pass, results };
}

export async function integrationSuiteTest() {
  // Emulates ui-triggered/integration-suite vitest by running core flows
  const sdkReady = await ensureSDKReady();
  if (!sdkReady.pass) return { pass: false, error: sdkReady.error || 'SDK not ready' };

  const core = await packMessageTest();
  const roundtrip = await unpackMessageTest();
  const discover = await discoverFeaturesTest();
  const threading = await messageThreadingTests();
  return aggregate({ core, roundtrip, discover, threading });
}

export async function securityComprehensiveTest() {
  // High-level canary: ensure pack/unpack returns standard failures on tamper
  try {
    const msgr = await getReadyDecentClient();
    try { await msgr.protocols.refresh(); } catch {}
    const malformed = '{"not":"a valid jwe"}';
    let result = null, error = null;
    try { result = await msgr.unpack(malformed); } catch (e) { error = e; }
    const pass = (result && result.success === false) || !!error;
    return { pass, result: result || null, error: error ? String(error) : null };
  } catch (err) {
    return { pass: false, error: String(err) };
  }
}

export async function protocolEdgeCasesTest() {
  // Exercises discover() with object queries and edge patterns
  const sdk = await ensureSDKReady();
  if (!sdk.pass) return { pass: false, error: sdk.error || 'SDK not ready' };
  const discoverObj = await discoverFeaturesTest(['https://didcomm.org/*']);
  const pass = discoverObj.pass === true;
  return { pass, discoverObj };
}

// Converted: permissions-helpers.test.js
export async function permissionsHelpersConvertedTest() {
  try {
    const rpc = async (kind) => {
      if (kind === 'requestDidcommPermissions') return { success: true };
      if (kind === 'checkDidcommPermission') return { ok: true };
      if (kind === 'checkMultipleDidcommPermissions') return [true, false];
      if (kind === 'listGrantedDidcommPermissions') return [];
      return { ok: true };
    };
    const helpers = createPermissionHelpers({ rpc });
    const requestOk = await helpers.requestOk([]);
    const checkRes = await helpers.check('p', 't');
    const checkMultiple = await helpers.checkMultiple(['p'], ['t']);
    const list = await helpers.listGranted(['p']);
    const pass = requestOk === true && checkRes && Array.isArray(checkMultiple) && Array.isArray(list);
    return { pass, requestOk, checkRes, checkMultiple, list };
  } catch (err) {
    return { pass: false, error: String(err) };
  }
}

// Converted: protocol-helpers.test.js
export async function protocolHelpersConvertedTest() {
  try {
    const mkMessenger = () => ({ rpc: async (kind) => {
      if (kind === 'getProtocolMethods') return { ok: true, methods: { 'trust-ping-v2': { ping: {} } } };
      if (kind === 'protocolInvoke') return { ok: true, result: { pong: true } };
      if (kind === 'advertise') return { ok: true };
      if (kind === 'discover') return { ok: true, result: {} };
      if (kind === 'intentAdvertise') return { ok: true };
      if (kind === 'intentDiscover') return { ok: true, result: {} };
      if (kind === 'intentRequest') return { ok: true };
      return { ok: true };
    }});
    const helpers = createProtocolHelpers(mkMessenger());
    await helpers.refresh();
    const list = helpers.list();
    const hasPing = list.includes('trust-ping-v2');
    const ping = helpers['trust-ping-v2'];
    const res = await ping.ping('did:x');
    const pass = hasPing && res && res.pong === true;
    return { pass, list, res };
  } catch (err) {
    return { pass: false, error: String(err) };
  }
}


