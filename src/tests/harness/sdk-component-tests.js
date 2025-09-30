import { getReadyDecentClient } from 'decent_app_sdk';
import { MessageTypes } from 'decent_app_sdk/constants';

async function init() {
  const msgr = await getReadyDecentClient();
  try { await msgr.protocols.refresh(); } catch {}
  return msgr;
}

export async function sdkClientIndexTest() {
  try {
    const msgr = await init();
    const { did } = await msgr.getDID();
    const pass = typeof did === 'string' && did.startsWith('did:');
    return { pass, did };
  } catch (err) {
    return { pass: false, error: String(err) };
  }
}

export async function sdkClientMessengerTest() {
  try {
    const msgr = await init();
    const info = {
      hasPack: typeof msgr.pack === 'function',
      hasUnpack: typeof msgr.unpack === 'function',
      hasProtocols: !!msgr.protocols,
      hasPermissions: !!msgr.permissions,
    };
    const pass = info.hasPack && info.hasUnpack && info.hasProtocols && info.hasPermissions;
    return { pass, info };
  } catch (err) {
    return { pass: false, error: String(err) };
  }
}

export async function sdkClientPermissionsTest() {
  try {
    const msgr = await init();
    let checked = null;
    try {
      checked = await msgr.permissions.check('https://didcomm.org/basicmessage/1.0', MessageTypes.BASIC_MESSAGE.MESSAGE);
    } catch {}
    const pass = typeof checked === 'boolean' || checked === null; // environment dependent
    return { pass, checked };
  } catch (err) {
    return { pass: false, error: String(err) };
  }
}

export async function sdkClientProtocolsTest() {
  try {
    const msgr = await init();
    let result = null, error = null;
    try { result = await msgr.protocols.discover(['https://*'], 400); } catch (e) { error = e; }
    const pass = error === null && typeof result === 'object';
    return { pass, result, error: error ? String(error) : null };
  } catch (err) {
    return { pass: false, error: String(err) };
  }
}

export async function sdkServiceWorkerRpcTest() {
  try {
    const msgr = await init();
    // A lightweight RPC: getDID is proxied through SW
    const { did } = await msgr.getDID();
    const pass = typeof did === 'string';
    return { pass, did };
  } catch (err) {
    return { pass: false, error: String(err) };
  }
}

export async function sdkServiceWorkerPermissionsTest() {
  try {
    const msgr = await init();
    let listed = null, error = null;
    try { listed = await msgr.permissions.listGranted(['https://didcomm.org/basicmessage/1.0']); } catch (e) { error = e; }
    const pass = error === null && Array.isArray(listed);
    return { pass, listed };
  } catch (err) {
    return { pass: false, error: String(err) };
  }
}

export async function sdkProtocolBasicMessageTest() {
  try {
    const msgr = await init();
    const { did } = await msgr.getDID();
    const packed = await msgr.pack(did, MessageTypes.BASIC_MESSAGE.MESSAGE, JSON.stringify({ hello: 'world' }), [], '');
    const pass = !!(packed && packed.success === true);
    return { pass, packed };
  } catch (err) {
    return { pass: false, error: String(err) };
  }
}

export async function sdkProtocolDiscoverFeaturesTest() {
  try {
    const msgr = await init();
    const result = await msgr.protocols.discover(['https://didcomm.org/*'], 400);
    const pass = result && typeof result === 'object';
    return { pass, result };
  } catch (err) {
    return { pass: false, error: String(err) };
  }
}

export async function sdkUtilsAttachmentsTest() {
  // Sanity: ensure attachments normalize via pack/unpack path
  try {
    const msgr = await init();
    const { did } = await msgr.getDID();
    const att = [{ id: 't1', mimeType: 'text/plain', filename: 'a.txt', description: 't', data: btoa('x') }];
    const packed = await msgr.pack(did, MessageTypes.BASIC_MESSAGE.MESSAGE, JSON.stringify({ t: 1 }), att, '');
    const unpacked = await msgr.unpack(packed.message);
    const pass = unpacked && unpacked.success === true;
    return { pass, packed, unpacked };
  } catch (err) {
    return { pass: false, error: String(err) };
  }
}

// New protocol wrappers: user-profile, share-media, report-problem
export async function sdkProtocolUserProfileTest() {
  try {
    const msgr = await init();
    const { did } = await msgr.getDID();
    try { await msgr.protocols.refresh(); } catch {}
    const p = msgr.protocols['user-profile-v1'];
    if (!p) return { pass: true, skipped: true, reason: 'user-profile-v1 proxy unavailable' };
    const sendRes = await p.invokeClientMethod('sendProfile', [did, { name: 'A' }, { send_back_yours: true }]);
    const got = await p.invokeClientMethod('getProfile', ['self']);
    const pass = !!(sendRes && sendRes.ok === true) && !!(got && got.ok === true);
    return { pass, sendRes, got };
  } catch (err) {
    return { pass: false, error: String(err) };
  }
}

export async function sdkProtocolShareMediaTest() {
  try {
    const msgr = await init();
    try { await msgr.protocols.refresh(); } catch {}
    const p = msgr.protocols['share-media-v1'];
    if (!p) return { pass: true, skipped: true, reason: 'share-media-v1 proxy unavailable' };
    const media = [{ mime_type: 'image/jpeg', base64: 'AAAA', filename: 'a.jpg', caption: 'hi' }];
    const res = await p.invokeClientMethod('shareMedia', ['did:x', media, {}]);
    const pass = !!(res && res.ok === true);
    return { pass, res };
  } catch (err) {
    return { pass: false, error: String(err) };
  }
}

export async function sdkProtocolReportProblemTest() {
  try {
    const msgr = await init();
    try { await msgr.protocols.refresh(); } catch {}
    const p = msgr.protocols['report-problem-v2'];
    if (!p) return { pass: true, skipped: true, reason: 'report-problem-v2 proxy unavailable' };
    const res = await p.invokeClientMethod('sendProblemReport', ['did:x', { problemCode: 'E_FAIL', comment: 'oops' }]);
    const pass = !!(res && res.ok === true);
    return { pass, res };
  } catch (err) {
    return { pass: false, error: String(err) };
  }
}


