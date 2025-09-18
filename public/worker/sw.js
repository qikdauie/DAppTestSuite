/* global registerAddress, sendMessage */   // ← injected by the browser
// ESM SW: import discover-features helpers
import { advertiseFeature, discoverFeatures, installFeatureAutoResponder } from './discover-features.js';
import {
  INTENTS,
  advertiseIntents,
  discoverIntentProviders as intentDiscover,
  requestIntent as intentRequest,
  installIntentRouter,
  sendProgress,
  requestTypeToAction,
  actionToResponseType
} from './app-intents.js';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const STORE      = 'messenger-store';
const KEY_DID    = 'peer-did';
const KEY_OUTBOX = 'outbox';

// ─────────────────────────────────────────────────────────────────────────────
// INSTALL / ACTIVATE
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('install',  e => e.waitUntil(self.skipWaiting()));
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
// Install auto responder for discover-features
installFeatureAutoResponder(() => self.myDid || null);

// Track pending UI prompts for interactive intent handling
const PENDING_UI_PROMPTS = new Map();

// Advertise app-intents features early (independent of DID registration)
(() => {
  try {
    // All apps provide the same intents
    advertiseIntents([
      INTENTS.SHARE,
      INTENTS.PICK_FILE,
      INTENTS.PICK_DATETIME,
      INTENTS.COMPOSE_EMAIL,
      INTENTS.OPEN_URL,
      INTENTS.DIAL_CALL,
      INTENTS.PICK_CONTACT,
      INTENTS.PICK_LOCATION,
      INTENTS.CAPTURE_PHOTO,
      INTENTS.CAPTURE_VIDEO,
      INTENTS.CAPTURE_AUDIO,
      INTENTS.SCAN_QR,
      INTENTS.SCAN_DOCUMENT,
      INTENTS.OPEN_MAP_NAVIGATION,
      INTENTS.ADD_CALENDAR_EVENT,
      INTENTS.ADD_CONTACT,
      INTENTS.SAVE_TO,
      INTENTS.PRINT,
      INTENTS.TRANSLATE,
      INTENTS.PAY,
      INTENTS.SIGN,
      INTENTS.VERIFY_SIGNATURE,
      INTENTS.ENCRYPT,
      INTENTS.DECRYPT
    ], ['provider']);
    // Advertise the app-intent protocol (optional informational)
    advertiseFeature('protocol', 'https://didcomm.org/app-intent/1.0', ['provider']);
  } catch {}
})();

// Intent router that asks the foreground client to collect input
installIntentRouter({
  onRequest: async (msg) => {
    const action = requestTypeToAction(msg?.type);
    const params = msg?.body?.params || {};
    try {
      switch (action) {
        case INTENTS.PICK_DATETIME: {
          await sendProgress(msg.from, 'awaiting_user', 10, 'Waiting for provider to pick a date');
          const input = await promptClientForIntent(action, params);
          if (!input) return { decline: { reason: 'cancelled' } };
          const iso = input.iso || new Date().toISOString();
          console.log('[SW:intents] Providing PICK_DATETIME result', { iso });
          return { response: { result: { value: iso } } };
        }
        case INTENTS.COMPOSE_EMAIL: {
          await sendProgress(msg.from, 'awaiting_user', 10, 'Waiting for provider to compose email');
          const input = await promptClientForIntent(action, params);
          if (!input) return { decline: { reason: 'cancelled' } };
          const to = Array.isArray(input.to) ? input.to : (input.to ? [input.to] : []);
          console.log('[SW:intents] Providing COMPOSE_EMAIL result', { to, subject: input.subject });
          return { response: { result: { sent: !!input.opened, message_id: 'msg_' + Date.now() } } };
        }
        case INTENTS.SHARE: {
          await sendProgress(msg.from, 'awaiting_user', 10, 'Waiting for provider to confirm share');
          const input = await promptClientForIntent(action, params);
          if (!input) return { decline: { reason: 'cancelled' } };
          const items = Array.isArray(input.items) ? input.items : [];
          console.log('[SW:intents] Providing SHARE result', { count: items.length });
          return { response: { result: { delivered: items.length > 0 || !!(params?.text), provider_message_id: 'share_' + Date.now() } } };
        }
        case INTENTS.OPEN_URL: {
          await sendProgress(msg.from, 'awaiting_user', 10, 'Waiting for provider to confirm open');
          const input = await promptClientForIntent(action, params);
          if (!input) return { decline: { reason: 'cancelled' } };
          console.log('[SW:intents] Providing OPEN_URL result', { url: input.url || params.url });
          return { response: { result: { opened: !!input.opened, handler: 'app' } } };
        }
        case INTENTS.PICK_FILE: {
          await sendProgress(msg.from, 'awaiting_user', 10, 'Waiting for provider to select files');
          const input = await promptClientForIntent(action, params);
          if (!input) return { decline: { reason: 'cancelled' } };
          const files = Array.isArray(input.files) ? input.files : [];
          const mapped = files.map(f => ({ name: f.name, ...(f.size != null ? { size_bytes: f.size } : {}), ...(f.type ? { mime: f.type } : {}) }));
          console.log('[SW:intents] Providing PICK_FILE result', { files: mapped });
          return { response: { result: { files: mapped } } };
        }
        case INTENTS.DIAL_CALL: {
          await sendProgress(msg.from, 'awaiting_user', 10, 'Waiting for provider to dial');
          const input = await promptClientForIntent(action, params);
          if (!input) return { decline: { reason: 'cancelled' } };
          const called = !!input.called;
          return { response: { result: { initiated: called, connection_state: called ? 'connected' : 'failed' } } };
        }
        case INTENTS.PICK_CONTACT: {
          await sendProgress(msg.from, 'awaiting_user', 10, 'Waiting for provider to pick a contact');
          const input = await promptClientForIntent(action, params);
          if (!input) return { decline: { reason: 'cancelled' } };
          const c = input.contact || null;
          const normalized = c ? {
            ...(c.id ? { id: c.id } : {}),
            ...(c.name ? { name: c.name } : {}),
            ...(c.organization ? { organization: c.organization } : {}),
            ...(Array.isArray(c.emails) ? { emails: c.emails } : {}),
            ...(Array.isArray(c.phones) ? { phones: c.phones } : (c.phone ? { phones: [c.phone] } : {})),
            ...(Array.isArray(c.addresses) ? { addresses: c.addresses } : {}),
            ...(c.notes ? { notes: c.notes } : {}),
            ...(c.avatar_attachment_id ? { avatar_attachment_id: c.avatar_attachment_id } : {})
          } : null;
          return { response: { result: { contacts: normalized ? [normalized] : [] } } };
        }
        case INTENTS.PICK_LOCATION: {
          await sendProgress(msg.from, 'awaiting_user', 10, 'Waiting for provider to pick a location');
          const input = await promptClientForIntent(action, params);
          if (!input) return { decline: { reason: 'cancelled' } };
          const lat = Number(input.lat);
          const lon = Number(input.lon);
          const label = input.label || '';
          return { response: { result: { lat, lon, place_name: label } } };
        }
        case INTENTS.CAPTURE_PHOTO: {
          await sendProgress(msg.from, 'awaiting_user', 10, 'Waiting for provider to capture photo');
          const input = await promptClientForIntent(action, params);
          if (!input) return { decline: { reason: 'cancelled' } };
          return { response: { result: { attachment_id: 'att_' + Date.now(), mime: 'image/jpeg' } } };
        }
        case INTENTS.CAPTURE_VIDEO: {
          await sendProgress(msg.from, 'awaiting_user', 10, 'Waiting for provider to capture video');
          const input = await promptClientForIntent(action, params);
          if (!input) return { decline: { reason: 'cancelled' } };
          return { response: { result: { attachment_id: 'att_' + Date.now(), mime: 'video/mp4', duration_seconds: 1 } } };
        }
        case INTENTS.CAPTURE_AUDIO: {
          await sendProgress(msg.from, 'awaiting_user', 10, 'Waiting for provider to capture audio');
          const input = await promptClientForIntent(action, params);
          if (!input) return { decline: { reason: 'cancelled' } };
          return { response: { result: { attachment_id: 'att_' + Date.now(), mime: 'audio/webm', duration_seconds: 1 } } };
        }
        case INTENTS.SCAN_QR: {
          await sendProgress(msg.from, 'awaiting_user', 10, 'Waiting for provider to scan QR');
          const input = await promptClientForIntent(action, params);
          if (!input) return { decline: { reason: 'cancelled' } };
          return { response: { result: { symbology: 'qr', text: input.content || '' } } };
        }
        case INTENTS.SCAN_DOCUMENT: {
          await sendProgress(msg.from, 'awaiting_user', 10, 'Waiting for provider to scan document');
          const input = await promptClientForIntent(action, params);
          if (!input) return { decline: { reason: 'cancelled' } };
          return { response: { result: { pdf: { attachment_id: 'att_' + Date.now() } } } };
        }
        case INTENTS.OPEN_MAP_NAVIGATION: {
          await sendProgress(msg.from, 'awaiting_user', 10, 'Waiting for provider to open maps');
          const input = await promptClientForIntent(action, params);
          if (!input) return { decline: { reason: 'cancelled' } };
          return { response: { result: { launched: !!input.opened, provider: 'maps' } } };
        }
        case INTENTS.ADD_CALENDAR_EVENT: {
          await sendProgress(msg.from, 'awaiting_user', 10, 'Waiting for provider to add calendar event');
          const input = await promptClientForIntent(action, params);
          if (!input) return { decline: { reason: 'cancelled' } };
          const id = input.id || ('evt_' + Date.now());
          return { response: { result: { created: true, event_id: id } } };
        }
        case INTENTS.ADD_CONTACT: {
          await sendProgress(msg.from, 'awaiting_user', 10, 'Waiting for provider to add contact');
          const input = await promptClientForIntent(action, params);
          if (!input) return { decline: { reason: 'cancelled' } };
          const id = input.id || ('contact_' + Date.now());
          return { response: { result: { created: true, contact_id: id } } };
        }
        case INTENTS.SAVE_TO: {
          await sendProgress(msg.from, 'awaiting_user', 10, 'Waiting for provider to save');
          const input = await promptClientForIntent(action, params);
          if (!input) return { decline: { reason: 'cancelled' } };
          return { response: { result: { saved: !!input.saved, path: input.location || '' } } };
        }
        case INTENTS.PRINT: {
          await sendProgress(msg.from, 'awaiting_user', 10, 'Waiting for provider to print');
          const input = await promptClientForIntent(action, params);
          if (!input) return { decline: { reason: 'cancelled' } };
          return { response: { result: { queued: !!input.printed, job_id: 'job_' + Date.now() } } };
        }
        case INTENTS.TRANSLATE: {
          await sendProgress(msg.from, 'awaiting_user', 10, 'Waiting for provider to translate');
          const input = await promptClientForIntent(action, params);
          if (!input) return { decline: { reason: 'cancelled' } };
          const to = input.to || params.to || 'en';
          const text = input.text || params.text || '';
          // naive fake translation: reverse text
          const translated = input.translated || text.split('').reverse().join('');
          return { response: { result: { text: translated } } };
        }
        case INTENTS.PAY: {
          await sendProgress(msg.from, 'awaiting_user', 10, 'Waiting for provider to pay');
          const input = await promptClientForIntent(action, params);
          if (!input) return { decline: { reason: 'cancelled' } };
          const status = !!input.paid ? 'captured' : 'declined';
          return { response: { result: { status, txn_id: 'txn_' + Date.now() } } };
        }
        case INTENTS.SIGN: {
          await sendProgress(msg.from, 'awaiting_user', 10, 'Waiting for provider to sign');
          const input = await promptClientForIntent(action, params);
          if (!input) return { decline: { reason: 'cancelled' } };
          const payload = input.payload || params.payload || '';
          const signature = input.signature || btoa(unescape(encodeURIComponent('sig:' + payload))).slice(0, 44);
          return { response: { result: { format: 'raw', value: signature } } };
        }
        case INTENTS.VERIFY_SIGNATURE: {
          await sendProgress(msg.from, 'awaiting_user', 10, 'Waiting for provider to verify');
          const input = await promptClientForIntent(action, params);
          if (!input) return { decline: { reason: 'cancelled' } };
          const valid = !!input.valid;
          return { response: { result: { verified: valid } } };
        }
        case INTENTS.ENCRYPT: {
          await sendProgress(msg.from, 'awaiting_user', 10, 'Waiting for provider to encrypt');
          const input = await promptClientForIntent(action, params);
          if (!input) return { decline: { reason: 'cancelled' } };
          const plaintext = input.plaintext || params.plaintext || '';
          const ciphertext = input.ciphertext || btoa(unescape(encodeURIComponent('ct:' + plaintext)));
          return { response: { result: { format: 'jwe', ciphertext_base64: ciphertext } } };
        }
        case INTENTS.DECRYPT: {
          await sendProgress(msg.from, 'awaiting_user', 10, 'Waiting for provider to decrypt');
          const input = await promptClientForIntent(action, params);
          if (!input) return { decline: { reason: 'cancelled' } };
          const plaintext = input.plaintext || '';
          return { response: { result: { payload_base64: btoa(unescape(encodeURIComponent(plaintext))) } } };
        }
        default:
          return { decline: { reason: 'not_supported', detail: action } };
      }
    } catch (err) {
      console.error('[SW:intents] onRequest handler failed', err);
      return { decline: { reason: 'error', detail: String(err) } };
    }
  }
});

function makeCorrelationId() {
  try { return crypto.randomUUID(); } catch { return Math.random().toString(36).slice(2) + Date.now(); }
}

async function promptClientForIntent(action, params) {
  const correlationId = makeCorrelationId();
  // Use all window clients, prefer focused one first
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    .then(list => list.sort((a, b) => (b.focused === true) - (a.focused === true)))
    .catch(() => []);
  const msg = { kind: 'intent-ui-request', correlationId, payload: { action, params } };
  if (clients.length) {
    try { clients[0].postMessage(msg); } catch (err) { console.error('[SW:intents] postMessage to focused client failed', err); broadcast(msg); }
  } else {
    console.log('[SW:intents] No window clients, broadcasting prompt');
    broadcast(msg);
  }
  return await new Promise(resolve => {
    const timeout = setTimeout(() => { PENDING_UI_PROMPTS.delete(correlationId); resolve(null); }, 20000);
    PENDING_UI_PROMPTS.set(correlationId, {
      resolve: (data) => { clearTimeout(timeout); resolve(data); }
    });
    console.log('[SW:intents] Awaiting UI response', { correlationId });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// RUNTIME STATE
// ─────────────────────────────────────────────────────────────────────────────
let myDid  = null;           // string   – this worker’s DID
let outbox = [];             // {dest, packed}[] – queued outbound envelopes

// Restore persisted state on start-up
(async () => {
  const cache   = await caches.open(STORE);

  const didHit  = await cache.match(KEY_DID);
  myDid  = didHit ? await didHit.text() : null;

  const boxHit  = await cache.match(KEY_OUTBOX);
  outbox = boxHit ? JSON.parse(await boxHit.text()) : [];

  if (myDid) flushOutbox();
})();

// ─────────────────────────────────────────────────────────────────────────────
// RPC HANDLER  (UI ↔ SW)
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('message', e => {
  // Some messages may be posted without a data envelope by older clients
  if (!e || !e.data) return;
  const { kind, data, port } = e.data || {};
  if (!kind) return;

  // UI → SW response for interactive prompts (not RPC)
  if (kind === 'intentUiResponse') {
    const cid = data?.correlationId;
    if (cid && PENDING_UI_PROMPTS.has(cid)) {
      const entry = PENDING_UI_PROMPTS.get(cid);
      PENDING_UI_PROMPTS.delete(cid);
      try { entry?.resolve?.(data?.payload || null); } catch {}
    }
    return;
  }

  // All other kinds are RPC and require a reply port
  if (!port) return;

  (async () => {
    switch (kind) {
      case 'getDID':
        port.postMessage(await swGetDID());
        break;

      case 'packMessage':
        port.postMessage(await swPackMessage(
          data.dest, data.type, data.body
        ));
        break;

      case 'packMessageFull':
        port.postMessage(await swPackMessageFull(
          data.dest, data.type, data.body, data.attachments || [], data.replyTo || ""
        ));
        break;

      case 'unpackMessage':
        port.postMessage(await swUnpackMessage(data.raw));
        break;

      case 'register':
        port.postMessage(await registerMyDid(data.did));
        break;

      case 'send':
        port.postMessage(await queueAndSend(data.dest, data.packed));
        break;

      case 'sendRaw': {
        try {
          const res = await sendMessage(data.dest, data.packed);
          // Return the raw RouterResult enum string for precise assertions
          port.postMessage({ ok: res === 'success', result: res });
        } catch (err) {
          port.postMessage({ ok: false, error: String(err), result: 'unknown-error' });
        }
        break;
      }

      case 'discover':
        port.postMessage(await discoverFeatures(data.matchers, data.timeout));
        break;

      case 'advertise':
        try {
          advertiseFeature(data.featureType, data.id, data.roles || []);
          port.postMessage({ ok: true });
        } catch (err) {
          port.postMessage({ ok: false, error: String(err) });
        }
        break;

      // ───── app-intents RPC ─────
      case 'intentAdvertise':
        try {
          // Accept `action` or `requestType` for flexibility; default role provider
          const action = data.action || data.goalCode; // legacy field name tolerated at RPC boundary
          const roles = data.roles || ['provider'];
          if (data.requestType && typeof data.requestType === 'string') {
            advertiseFeature('message-type', data.requestType, roles);
          } else if (action) {
            // Build requestType from action
            const base = 'https://didcomm.org/app-intent/1.0';
            const type = `${base}/${String(action)}`.includes('-request')
              ? `${base}/${String(action)}`
              : `${base}/${String(action)}-request`;
            advertiseFeature('message-type', type, roles);
          } else {
            throw new Error('action or requestType is required');
          }
          port.postMessage({ ok: true });
        } catch (err) {
          port.postMessage({ ok: false, error: String(err) });
        }
        break;

      case 'intentDiscover':
        port.postMessage(await intentDiscover(data.matchers || ['*'], data.timeout));
        break;

      case 'intentRequest': {
        const res = await intentRequest(data.dest, data.requestBody, {
          waitForResult: data.waitForResult,
          timeoutMs: data.timeout,
          requestType: data.requestType,
        });
        port.postMessage(res);
        break;
      }

      // ───── DIDComm permissions RPC ─────
      case 'checkDidcommPermission': {
        try {
          const ok = await self.checkDidcommPermission(data.protocolUri, data.messageTypeUri);
          port.postMessage(ok);
        } catch (err) {
          port.postMessage(false);
        }
        break;
      }
      case 'checkMultipleDidcommPermissions': {
        try {
          const res = await self.checkMultipleDidcommPermissions(data.protocolUris, data.messageTypeUris);
          port.postMessage(res);
        } catch (err) {
          port.postMessage([]);
        }
        break;
      }
      case 'requestDidcommPermissions': {
        try {
          const res = await self.requestDidcommPermissions(data.requests);
          port.postMessage(res);
        } catch (err) {
          port.postMessage({ ok: false, error: String(err) });
        }
        break;
      }
      case 'listGrantedDidcommPermissions': {
        try {
          const res = await self.listGrantedDidcommPermissions(data.protocolUris);
          port.postMessage(res);
        } catch (err) {
          port.postMessage([]);
        }
        break;
      }

      default:                                                   // ignore
    }
  })();
});

// ─────────────────────────────────────────────────────────────────────────────
// REGISTER DID
// ─────────────────────────────────────────────────────────────────────────────
async function registerMyDid(did) {

  const res = await registerAddress(did);
  if (res !== 'success') return { ok: false, err: res };

  myDid = did;
  // Expose DID for library's auto-disclose guard if needed
  self.myDid = myDid;
  const cache = await caches.open(STORE);
  await cache.put(KEY_DID, new Response(did));

  flushOutbox();
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// OUTBOUND QUEUE
// ─────────────────────────────────────────────────────────────────────────────
async function queueAndSend(dest, packed) {
  outbox.push({ dest, packed });
  await persistOutbox();
  if (myDid) flushOutbox();
  return { ok: true };
}

async function flushOutbox() {
  if (!myDid || !outbox.length) return;

  const pending = [...outbox];
  outbox = [];
  await persistOutbox();

  for (const { dest, packed } of pending) {
    try {
      await sendMessage(dest, packed);
      console.log('sent', dest, packed.slice(0, 100));
    } catch (err) {
      console.error('Router send failed – will retry:', err);
      outbox.push({ dest, packed });
    }
  }
  if (outbox.length) await persistOutbox();
}

async function persistOutbox() {
  const cache = await caches.open(STORE);
  await cache.put(KEY_OUTBOX, new Response(JSON.stringify(outbox)));
}

// ─────────────────────────────────────────────────────────────────────────────
// INBOUND DELIVERY  (Router → SW)
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('delivery', e => {
  if (!e.data) return;
  console.log('incoming', e.data);
  broadcast({ kind: 'incoming', raw: e.data });
  // auto-disclose handled by library via installAutoResponder
});

function broadcast(msg) {
  self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    .then(clients => clients.forEach(c => c.postMessage(msg)));
}


// ─────────────────────────────────────────────────────────────────────────────
// Window-only APIs now live in SW: expose simple wrappers for RPC
// ─────────────────────────────────────────────────────────────────────────────
async function swGetDID() { return await self.getDID(); }

async function swPackMessage(dest, type, body) {
  return await self.packMessage(dest, type, body, [], "");
}

async function swUnpackMessage(raw) { return await self.unpackMessage(raw); }

async function swPackMessageFull(dest, type, body, attachments, replyTo) {
  try {
    return await self.packMessage(dest, type, body, attachments || [], replyTo || "");
  } catch (err) {
    return { success: false, error_code: 0, error: String(err), message: '' };
  }
}
