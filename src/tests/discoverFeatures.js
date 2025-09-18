import { connectMessenger } from '../sdk/messenger-client.js';

/**
 * Basic functional smoke-test for discoverFeatures()
 * 1. Starts/connects the messenger SDK
 * 2. Executes discover() with a broad matcher
 * 3. Confirms a FeatureMap object is returned
 */
export async function discoverFeaturesTest(matchers = ['https://*']) {
  const msgr = await connectMessenger();
  if (!msgr || typeof msgr.discover !== 'function') {
    throw new Error('connectMessenger().discover() is not available.');
  }

  let featureMap;
  let error = null;
  try {
    featureMap = await msgr.discover(matchers, 600);
  } catch (err) {
    error = err;
  }

  const pass = error === null && typeof featureMap === 'object' && featureMap !== null;

  return {
    pass,
    request: { matchers },
    response: featureMap,
    error: error ? error.message : null
  };
} 

/**
 * Multi-instance feature divergence test
 * - Instance on port 3000 should advertise issue-credential/2.0 (issuer)
 * - Instance on port 3001 should advertise present-proof/2.0 (verifier)
 * This test queries broadly and then asserts at least one peer advertises each feature.
 */
export async function discoverDivergentFeaturesTest() {
  const msgr = await connectMessenger();
  if (!msgr || typeof msgr.discover !== 'function') {
    throw new Error('connectMessenger().discover() is not available.');
  }

  const matchers = [
    'https://didcomm.org/issue-credential/2.0',
    'https://didcomm.org/present-proof/2.0',
    'https://didcomm.org/basicmessage/2.0',
  ];

  const caps = await msgr.discover(matchers, 800);

  const peers = Object.keys(caps || {});
  const featuresByPeer = Object.fromEntries(
    peers.map(p => [p, (caps[p] || []).map(f => f.id)])
  );

  const hasIssuer   = peers.some(p => featuresByPeer[p].includes('https://didcomm.org/issue-credential/2.0'));
  const hasVerifier = peers.some(p => featuresByPeer[p].includes('https://didcomm.org/present-proof/2.0'));
  const hasBasic    = peers.some(p => featuresByPeer[p].includes('https://didcomm.org/basicmessage/2.0'));

  // Current instance does not disclose to itself; expect only the OTHER side's caps
  const port = (typeof window !== 'undefined' && window.location && window.location.port) ? window.location.port : '';
  let pass;
  let expected;
  if (port === '3000') {
    pass = hasVerifier && hasBasic; // expect 3001's present-proof + basicmessage
    expected = ['https://didcomm.org/present-proof/2.0', 'https://didcomm.org/basicmessage/2.0'];
  } else if (port === '3001') {
    pass = hasIssuer && hasBasic;   // expect 3000's issue-credential + basicmessage
    expected = ['https://didcomm.org/issue-credential/2.0', 'https://didcomm.org/basicmessage/2.0'];
  } else {
    // Fallback: at least one of issuer/verifier plus basicmessage
    pass = (hasIssuer || hasVerifier) && hasBasic;
    expected = ['(issuer OR verifier)', 'https://didcomm.org/basicmessage/2.0'];
  }

  return {
    pass,
    peers,
    featuresByPeer,
    port,
    expected
  };
}

/**
 * Object-form query test
 * Verifies that discover() accepts full query objects with 'match' and returns a FeatureMap.
 */
export async function discoverFeaturesObjectQueryTest() {
  const msgr = await connectMessenger();
  if (!msgr || typeof msgr.discover !== 'function') {
    throw new Error('connectMessenger().discover() is not available.');
  }

  const queries = [
    { 'feature-type': 'protocol', match: 'https://didcomm.org/*' }
  ];

  let result = null;
  let error = null;
  try {
    result = await msgr.discover(queries, 600);
  } catch (err) {
    error = err;
  }

  const pass = error === null && result && typeof result === 'object';
  return { pass, queries, response: result, error: error ? error.message : null };
}