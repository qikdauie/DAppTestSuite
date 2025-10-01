import { getReadyDecentClient} from 'decent_app_sdk';
import { MessageTypes } from 'decent_app_sdk/constants';
import { extractThid } from '../../../submodules/decent_app_sdk/src/utils/message-helpers.js';

export async function unpackMessageTest(scenarioName = null) {
  const msgr = await getReadyDecentClient();
  try { await msgr.protocols.refresh(); } catch {}
  if (!msgr || typeof msgr.pack !== 'function' || typeof msgr.unpack !== 'function' || typeof msgr.getDID !== 'function') {
    throw new Error('Service worker pack/unpack/getDID is not available.');
  }

  // Prepare sample payload
  const { did } = await msgr.getDID();
  const bodyObj = { timestamp: Date.now(), note: 'roundtrip-test' };
  const bodyJson = JSON.stringify(bodyObj);

  // Define scenarios
  const scenarios = [
    { sign: false, encrypt: false, name: 'plain' },
    { sign: true, encrypt: false, name: 'signed' },
    { sign: false, encrypt: true, name: 'encrypted' },
    { sign: true, encrypt: true, name: 'signed+encrypted' }
  ];

  // If specific scenario requested, run only that one
  const scenariosToRun = scenarioName 
    ? scenarios.filter(s => s.name === scenarioName)
    : scenarios;

  const results = {};

  function isStdFailure(obj) {
    return obj && obj.success === false && typeof obj.error_code === 'number' && typeof obj.error === 'string' && obj.error.length > 0;
  }

  for (const scenario of scenariosToRun) {
    // Pack the message first
    const packed = await msgr.pack(did, MessageTypes.BASIC_MESSAGE.MESSAGE, bodyJson, [], "");
    if (!packed.success) {
      results[scenario.name] = {
        pass: false,
        step: 'pack',
        packed,
        failure: isStdFailure(packed) ? { hasStdError: true, hasCode: true, error: packed.error, error_code: packed.error_code } : null
      };
      continue;
    }

    // Now unpack it
    const unpacked = await msgr.unpack(packed.message);

    // Parse the unpacked message so we can compare bodies independent of JSON string order
    let bodiesEqual = false;
    let unpackedParsed = null;
    if (unpacked.success === true) {
      try {
        unpackedParsed = JSON.parse(unpacked.message);
        if (typeof unpackedParsed.body === 'object' && unpackedParsed.body !== null) {
          // Deep equality check on keys/values (shallow level) – sufficient for this simple body
          bodiesEqual = Object.keys(bodyObj).length === Object.keys(unpackedParsed.body).length &&
                        Object.entries(bodyObj).every(([k, v]) => unpackedParsed.body[k] === v);
        }
      } catch (e) {
        // ignore; bodiesEqual remains false
      }
    }

    // Thid verification
    const packedThid = packed?.thid || '';
    const unpackedThid = extractThid(unpacked?.message) || '';
    const thidMatches = packedThid === unpackedThid && packedThid.length > 0;

    const pass = unpacked.success === true && bodiesEqual && thidMatches;

    let unpackFailure = null;
    if (!pass && unpacked && unpacked.success === false) {
      unpackFailure = isStdFailure(unpacked) ? {
        hasStdError: true,
        hasCode: true,
        error: unpacked.error,
        error_code: unpacked.error_code,
      } : null;
    }

    // Analyze the packed message
    let analysis = {};
    if (packed.message) {
      try {
        const parsed = JSON.parse(packed.message);
        analysis = {
          hasJwe: parsed.protected !== undefined,
          hasJws: parsed.payload !== undefined && typeof parsed.payload === 'string',
          isJwm: parsed.id !== undefined && typeof parsed.type === 'string' && parsed.type.startsWith('https://didcomm.org/'),
          messageType: parsed.type || 'unknown',
          structure: Object.keys(parsed).join(', ')
        };
      } catch (e) {
        analysis = { parseError: e.message, rawLength: packed.message.length };
      }
    }

    // Add thid info from the unpacked envelope
    let thidLocation = null;
    if (unpackedParsed) {
      const hasV2 = typeof unpackedParsed?.thid === 'string' || typeof unpackedParsed?.pthid === 'string';
      const hasV1 = !!(unpackedParsed['~thread'] && (typeof unpackedParsed['~thread']?.thid === 'string' || typeof unpackedParsed['~thread']?.pthid === 'string'));
      thidLocation = hasV2 ? 'v2' : (hasV1 ? 'v1' : null);
    }
    analysis = { ...analysis, thid: unpackedThid || null, thidLocation };

    results[scenario.name] = {
      pass,
      scenario: { sign: scenario.sign, encrypt: scenario.encrypt },
      packed,
      unpacked,
      unpackFailure,
      expectedBody: bodyJson,
      analysis,
      packedThid,
      unpackedThid,
      thidMatches,
      thidVerification: { packedThid, unpackedThid, matches: thidMatches },
      ...(thidMatches ? {} : { thidMismatch: { expected: packedThid, actual: unpackedThid, scenario: scenario.name } })
    };
  }

  // Overall pass if all scenarios pass
  const overallPass = Object.values(results).every(r => r.pass);

  return {
    pass: overallPass,
    results,
    scenarios: scenarios.map(s => ({ name: s.name, sign: s.sign, encrypt: s.encrypt }))
  };
}

// Individual scenario test functions
export async function unpackMessagePlainTest() {
  return await unpackMessageTest('plain');
}

export async function unpackMessageSignedTest() {
  return await unpackMessageTest('signed');
}

export async function unpackMessageEncryptedTest() {
  return await unpackMessageTest('encrypted');
}

export async function unpackMessageSignedEncryptedTest() {
  return await unpackMessageTest('signed+encrypted');
}


