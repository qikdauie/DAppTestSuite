import { getReadyDecentClient} from 'decent_app_sdk';
import { PIURI } from 'decent_app_sdk/constants';

/**
 * Basic functional smoke-test for discoverFeatures()
 * 1. Starts/connects the messenger SDK
 * 2. Executes discover() with a broad matcher
 * 3. Confirms a FeatureMap object is returned
 */
export async function discoverFeaturesTest(matchers = ['https://*']) {
  const msgr = await getReadyDecentClient();
  try { await msgr.protocols.refresh(); } catch {}

  let featureMap;
  let error = null;
  try {
    featureMap = await msgr.protocols.discover(matchers, 600);
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
  const msgr = await getReadyDecentClient();
  try { await msgr.protocols.refresh(); } catch {}

  const matchers = [
    PIURI.ISSUE_CREDENTIAL_V2,
    PIURI.PRESENT_PROOF_V2,
    PIURI.BASIC_MESSAGE_V1,
  ];

  const caps = await msgr.protocols.discover(matchers, 800);

  const peers = Object.keys(caps || {});
  const featuresByPeer = Object.fromEntries(
    peers.map(p => [p, (caps[p] || []).map(f => f.id)])
  );

  const hasIssuer   = peers.some(p => featuresByPeer[p].includes(PIURI.ISSUE_CREDENTIAL_V2));
  const hasVerifier = peers.some(p => featuresByPeer[p].includes(PIURI.PRESENT_PROOF_V2));
  const hasBasic    = peers.some(p => featuresByPeer[p].includes(PIURI.BASIC_MESSAGE_V1));

  // Current instance does not disclose to itself; expect only the OTHER side's caps
  const port = (typeof window !== 'undefined' && window.location && window.location.port) ? window.location.port : '';
  let pass;
  let expected;
  if (port === '3000') {
    pass = hasVerifier && hasBasic; // expect 3001's present-proof + basicmessage
    expected = [PIURI.PRESENT_PROOF_V2, PIURI.BASIC_MESSAGE_V1];
  } else if (port === '3001') {
    pass = hasIssuer && hasBasic;   // expect 3000's issue-credential + basicmessage
    expected = [PIURI.ISSUE_CREDENTIAL_V2, PIURI.BASIC_MESSAGE_V1];
  } else {
    // Fallback: at least one of issuer/verifier plus basicmessage
    pass = (hasIssuer || hasVerifier) && hasBasic;
    expected = ['(issuer OR verifier)', PIURI.BASIC_MESSAGE_V1];
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
  const msgr = await getReadyDecentClient();
  try { await msgr.protocols.refresh(); } catch {}

  const queries = [
    { 'feature-type': 'protocol', match: 'https://didcomm.org/*' }
  ];

  let result = null;
  let error = null;
  try {
    result = await msgr.protocols.discover(queries, 600);
  } catch (err) {
    error = err;
  }

  const pass = error === null && result && typeof result === 'object';
  return { pass, queries, response: result, error: error ? error.message : null };
}


