import { connectMessenger } from '../sdk/messenger-client.js';

const BASE = 'https://didcomm.org/app-intent/1.0';
const INTENTS = {
  PICK_DATETIME: 'pick-datetime',
  SHARE: 'share',
  COMPOSE_EMAIL: 'compose-email',
  OPEN_URL: 'open-url',
  PICK_FILE: 'pick-file',
};
const REQ = (action) => `${BASE}/${action}-request`;

function pickFirstPeerAdvertising(capsMap, requestType) {
  const entries = Object.entries(capsMap || {});
  for (const [peer, caps] of entries) {
    const ids = (caps || []).map(c => c.id);
    if (ids.includes(requestType)) return peer;
  }
  return null;
}

export async function discoverIntentProvidersTest(matchers = ['*']) {
  const msgr = await connectMessenger();
  if (!msgr || typeof msgr.intentDiscover !== 'function') {
    throw new Error('connectMessenger().intentDiscover() is not available.');
  }

  let providers = {};
  let error = null;
  try {
    providers = await msgr.intentDiscover(matchers, 800);
  } catch (err) {
    error = err;
  }

  const pass = error === null && providers && typeof providers === 'object';
  return { pass, matchers, providers, error: error ? error.message : null };
}

export async function intentPickDatetimeTest() {
  const msgr = await connectMessenger();
  if (!msgr || typeof msgr.intentDiscover !== 'function' || typeof msgr.intentRequest !== 'function') {
    throw new Error('App-intents API not available.');
  }

  const providers = await msgr.intentDiscover([REQ(INTENTS.PICK_DATETIME)], 1000);
  const dest = pickFirstPeerAdvertising(providers, REQ(INTENTS.PICK_DATETIME));
  if (!dest) return { pass: false, reason: 'no_provider', providers };

  const body = {
    params: {},
    return: { expect: 'result', progress: false }
  };
  const res = await msgr.intentRequest(dest, body, { waitForResult: true, timeout: 3000, requestType: REQ(INTENTS.PICK_DATETIME) });
  const pass = !!res?.success && !!(res?.response?.result?.value);
  return { pass, dest, request: body, response: res };
}

export async function intentShareTest() {
  const msgr = await connectMessenger();
  const providers = await msgr.intentDiscover([REQ(INTENTS.SHARE)], 1000);
  const dest = pickFirstPeerAdvertising(providers, REQ(INTENTS.SHARE));
  if (!dest) return { pass: false, reason: 'no_provider', providers };

  const body = {
    params: { text: 'Hello from tests!' },
    return: { expect: 'result', progress: false }
  };
  const res = await msgr.intentRequest(dest, body, { waitForResult: true, timeout: 3000, requestType: REQ(INTENTS.SHARE) });
  const pass = !!res?.success && (res?.response?.result?.delivered === true);
  return { pass, dest, request: body, response: res };
}

export async function intentComposeEmailTest() {
  const msgr = await connectMessenger();
  const providers = await msgr.intentDiscover([REQ(INTENTS.COMPOSE_EMAIL)], 1000);
  const dest = pickFirstPeerAdvertising(providers, REQ(INTENTS.COMPOSE_EMAIL));
  if (!dest) return { pass: false, reason: 'no_provider', providers };

  const body = {
    params: { to: ['test@example.com'], subject: 'Test Email', body: 'Body from test suite' },
    return: { expect: 'result', progress: false }
  };
  const res = await msgr.intentRequest(dest, body, { waitForResult: true, timeout: 3000, requestType: REQ(INTENTS.COMPOSE_EMAIL) });
  const pass = !!res?.success && (res?.response?.result?.sent === true || res?.response?.result?.draft_saved === true);
  return { pass, dest, request: body, response: res };
}

export async function intentOpenUrlTest() {
  const msgr = await connectMessenger();
  const providers = await msgr.intentDiscover([REQ(INTENTS.OPEN_URL)], 1000);
  const dest = pickFirstPeerAdvertising(providers, REQ(INTENTS.OPEN_URL));
  if (!dest) return { pass: false, reason: 'no_provider', providers };

  const body = {
    params: { url: 'https://example.com/' },
    return: { expect: 'result', progress: false }
  };
  const res = await msgr.intentRequest(dest, body, { waitForResult: true, timeout: 3000, requestType: REQ(INTENTS.OPEN_URL) });
  const openedVal = res?.response?.result?.opened;
  const pass = !!res?.success && typeof openedVal === 'boolean';
  return { pass, dest, request: body, response: res };
}

export async function intentPickFileTest() {
  const msgr = await connectMessenger();
  const providers = await msgr.intentDiscover([REQ(INTENTS.PICK_FILE)], 1000);
  const dest = pickFirstPeerAdvertising(providers, REQ(INTENTS.PICK_FILE));
  if (!dest) return { pass: false, reason: 'no_provider', providers };

  const body = {
    params: {},
    return: { expect: 'result', progress: false }
  };
  const res = await msgr.intentRequest(dest, body, { waitForResult: true, timeout: 5000, requestType: REQ(INTENTS.PICK_FILE) });
  const files = res?.response?.result?.files;
  const pass = !!res?.success && Array.isArray(files);
  return { pass, dest, request: body, response: res };
}

export async function discoverDivergentIntentsTest() {
  const msgr = await connectMessenger();
  const providers = await msgr.intentDiscover(['*'], 1000);
  const peers = Object.keys(providers || {});
  const byPeer = Object.fromEntries(peers.map(p => [p, (providers[p] || []).map(f => f.id)]));

  const port = (typeof window !== 'undefined' && window.location && window.location.port) ? window.location.port : '';
  const hasPicker = peers.some(p => byPeer[p].includes(REQ(INTENTS.PICK_DATETIME)));
  const hasShare = peers.some(p => byPeer[p].includes(REQ(INTENTS.SHARE)));
  const hasEmail = peers.some(p => byPeer[p].includes(REQ(INTENTS.COMPOSE_EMAIL)));

  let pass;
  let expected;
  if (port === '3000') {
    // Expect the peer (3001) to advertise SHARE at least
    pass = hasShare;
    expected = [REQ(INTENTS.SHARE)];
  } else if (port === '3001') {
    // Expect the peer (3000) to advertise PICK_DATETIME or COMPOSE_EMAIL
    pass = hasPicker || hasEmail;
    expected = [REQ(INTENTS.PICK_DATETIME), REQ(INTENTS.COMPOSE_EMAIL)];
  } else {
    pass = (hasPicker || hasEmail) && hasShare;
    expected = ['(date/email)', REQ(INTENTS.SHARE)];
  }

  return { pass, peers, intentsByPeer: byPeer, port, expected };
}

/**
 * Object-form and wildcard discovery for app-intents
 */
export async function intentDiscoverObjectAndWildcardTest() {
  const msgr = await connectMessenger();
  if (!msgr || typeof msgr.intentDiscover !== 'function') {
    throw new Error('connectMessenger().intentDiscover() is not available.');
  }

  const objectQuery = [{ ['feature-type']: 'message-type', match: `${BASE}/*-request` }];
  const starQuery = ['*'];

  const providersObject = await msgr.intentDiscover(objectQuery, 800);
  const providersStar = await msgr.intentDiscover(starQuery, 800);

  const okObject = providersObject && typeof providersObject === 'object';
  const okStar = providersStar && typeof providersStar === 'object';

  return {
    pass: !!okObject && !!okStar,
    objectQuery,
    starQuery,
    providersObject,
    providersStar
  };
}


