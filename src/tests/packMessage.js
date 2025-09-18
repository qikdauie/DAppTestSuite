import { connectMessenger } from '../sdk/messenger-client.js';

export async function packMessageTest(scenarioName = null) {
  const msgr = await connectMessenger();
  if (!msgr || typeof msgr.pack !== 'function' || typeof msgr.getDID !== 'function') {
    throw new Error('Service worker pack/getDID is not available.');
  }

  // Prepare sample payload
  const { did } = await msgr.getDID();
  const bodyObj = { timestamp: Date.now(), note: 'unit-test' };
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
    let result;
    try {
      result = await msgr.pack(did, "https://didcomm.org/basicmessage/2.0/send-message", bodyJson, scenario.sign, scenario.encrypt);
    } catch (err) {
      results[scenario.name] = {
        pass: false,
        error: err.message,
      };
      continue;
    }

    const pass = result && result.success === true && typeof result.message === 'string' && result.message.length > 0;

    // Validate standardized error fields if pack failed
    let failureMeta = null;
    if (!pass && result && result.success === false) {
      const hasStdError = typeof result.error === 'string' && result.error.length > 0;
      const hasCode = typeof result.error_code === 'number';
      failureMeta = { hasStdError, hasCode, error: result.error, error_code: result.error_code };
    }

    // Analyze the packed message to detect signing/encryption
    let analysis = {};
    if (pass && result.message) {
      try {
        const parsed = JSON.parse(result.message);
        analysis = {
          hasJwe: parsed.protected !== undefined,
          hasJws: parsed.payload !== undefined && typeof parsed.payload === 'string',
          isJwm: parsed.id !== undefined && typeof parsed.type === 'string' && parsed.type.startsWith('https://didcomm.org/'),
          messageType: parsed.type || 'unknown',
          structure: Object.keys(parsed).join(', ')
        };
      } catch (e) {
        analysis = { parseError: e.message, rawLength: result.message.length };
      }
    }

    results[scenario.name] = {
      pass,
      scenario: { sign: scenario.sign, encrypt: scenario.encrypt },
      request: {
        destDid: did,
        bodyJson,
        sign: scenario.sign,
        encrypt: scenario.encrypt
      },
      response: result,
      failure: failureMeta,
      analysis
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
export async function packMessagePlainTest() {
  return await packMessageTest('plain');
}

export async function packMessageSignedTest() {
  return await packMessageTest('signed');
}

export async function packMessageEncryptedTest() {
  return await packMessageTest('encrypted');
}

export async function packMessageSignedEncryptedTest() {
  return await packMessageTest('signed+encrypted');
} 