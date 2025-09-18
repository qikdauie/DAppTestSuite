/*
 * App-Intents 1.0 — minimal helper for DIDComm-based intent requests
 *
 * Exports (ESM):
 *   - advertiseIntent(intent: string, roles?: string[])
 *   - discoverIntentProviders(matchers?: string[], timeoutMs?: number) → Promise<Record<peerDid, Feature[]>>
 *   - installIntentRouter(handlers: { onRequest?: (msg) => Promise<Accept|Decline>, onCancel?: (msg) => void })
 *   - requestIntent(destDid: string, requestBody: AppIntentRequest, opts?: { waitForResult?: boolean, onProgress?: (progress) => void, timeoutMs?: number })
 *   - sendAccept(destDid, result?, receipt?)
 *   - sendDecline(destDid, reason, detail?, retry_after_ms?)
 *   - sendProgress(destDid, stage?, percent?, message?)
 */

import { advertiseFeature } from './discover-features.js';

// ──────────────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────────────
export const APP_INTENT_BASE = 'https://didcomm.org/app-intent/1.0';
export const TYPES = {
  // Requests are action-specific: `${APP_INTENT_BASE}/<action>-request`
  decline: `${APP_INTENT_BASE}/decline`,
  progress: `${APP_INTENT_BASE}/progress`,
  cancel: `${APP_INTENT_BASE}/cancel`
};

// ──────────────────────────────────────────────────────────────────────────────
// Developer-friendly intent catalog and helpers
// ──────────────────────────────────────────────────────────────────────────────
export const INTENTS = {
  SHARE: 'share',
  COMPOSE_EMAIL: 'compose-email',
  DIAL_CALL: 'dial-call',
  OPEN_URL: 'open-url',
  PICK_FILE: 'pick-file',
  PICK_CONTACT: 'pick-contact',
  PICK_DATETIME: 'pick-datetime',
  PICK_LOCATION: 'pick-location',
  CAPTURE_PHOTO: 'capture-photo',
  CAPTURE_VIDEO: 'capture-video',
  CAPTURE_AUDIO: 'capture-audio',
  SCAN_QR: 'scan-qr',
  SCAN_DOCUMENT: 'scan-document',
  OPEN_MAP_NAVIGATION: 'open-map-navigation',
  ADD_CALENDAR_EVENT: 'add-calendar-event',
  ADD_CONTACT: 'add-contact',
  SAVE_TO: 'save-to',
  PRINT: 'print',
  TRANSLATE: 'translate',
  PAY: 'pay',
  SIGN: 'sign',
  VERIFY_SIGNATURE: 'verify-signature',
  ENCRYPT: 'encrypt',
  DECRYPT: 'decrypt'
};

const INTENT_TIER = {
  [INTENTS.SHARE]: 'M',
  [INTENTS.COMPOSE_EMAIL]: 'H',
  [INTENTS.DIAL_CALL]: 'H',
  [INTENTS.OPEN_URL]: 'M',
  [INTENTS.PICK_FILE]: 'M',
  [INTENTS.PICK_CONTACT]: 'M',
  [INTENTS.PICK_DATETIME]: 'L',
  [INTENTS.PICK_LOCATION]: 'M',
  [INTENTS.CAPTURE_PHOTO]: 'H',
  [INTENTS.CAPTURE_VIDEO]: 'H',
  [INTENTS.CAPTURE_AUDIO]: 'H',
  [INTENTS.SCAN_QR]: 'M',
  [INTENTS.SCAN_DOCUMENT]: 'M',
  [INTENTS.OPEN_MAP_NAVIGATION]: 'M',
  [INTENTS.ADD_CALENDAR_EVENT]: 'H',
  [INTENTS.ADD_CONTACT]: 'H',
  [INTENTS.SAVE_TO]: 'M',
  [INTENTS.PRINT]: 'M',
  [INTENTS.TRANSLATE]: 'L',
  [INTENTS.PAY]: 'H',
  [INTENTS.SIGN]: 'H',
  [INTENTS.VERIFY_SIGNATURE]: 'L',
  [INTENTS.ENCRYPT]: 'H',
  [INTENTS.DECRYPT]: 'H'
};

const INTENT_CODES_SET = new Set(Object.values(INTENTS));

function toActionCode(intentKeyOrCode) {
  if (!intentKeyOrCode) throw new Error('intent/action is required');
  const val = String(intentKeyOrCode);
  if (INTENT_CODES_SET.has(val)) return val;
  const key = val.toUpperCase();
  if (INTENTS[key]) return INTENTS[key];
  throw new Error(`Unknown intent/action: ${intentKeyOrCode}`);
}

export function isKnownIntent(intentKeyOrCode) {
  try { return !!toActionCode(intentKeyOrCode); } catch { return false; }
}

export function actionToRequestType(actionCode) {
  const code = toActionCode(actionCode);
  return `${APP_INTENT_BASE}/${code}-request`;
}

export function actionToResponseType(actionCode) {
  const code = toActionCode(actionCode);
  return `${APP_INTENT_BASE}/${code}-response`;
}

export function requestTypeToAction(type) {
  console.log('requestTypeToAction', type);
  const t = String(type || '');
  if (!t.startsWith(APP_INTENT_BASE + '/')) return '';
  const suffix = '-request';
  if (!t.endsWith(suffix)) return '';
  const middle = t.slice(APP_INTENT_BASE.length + 1, t.length - suffix.length);
  return INTENT_CODES_SET.has(middle) ? middle : '';
}

export function responseTypeToAction(type) {
  const t = String(type || '');
  if (!t.startsWith(APP_INTENT_BASE + '/')) return '';
  const suffix = '-response';
  if (!t.endsWith(suffix)) return '';
  const middle = t.slice(APP_INTENT_BASE.length + 1, t.length - suffix.length);
  return INTENT_CODES_SET.has(middle) ? middle : '';
}

export function advertiseIntent(intentKeyOrCode, roles = ['provider']) {
  const code = toActionCode(intentKeyOrCode);
  const requestType = actionToRequestType(code);
  // Per spec: advertise support for request message types using feature_type 'message-type'
  advertiseFeature('message-type', requestType, roles);
  return code;
}

export function advertiseIntents(intentKeysOrCodes = [], roles = ['provider']) {
  const list = Array.isArray(intentKeysOrCodes) ? intentKeysOrCodes : [intentKeysOrCodes];
  const codes = [];
  for (const item of list) {
    try { codes.push(advertiseIntent(item, roles)); } catch {}
  }
  return codes;
}

export function advertiseAllIntents(roles = ['provider']) {
  return advertiseIntents(Object.values(INTENTS), roles);
}

export function advertiseIntentsByTier(tier, roles = ['provider']) {
  const t = String(tier || '').toUpperCase();
  if (!t) return [];
  const chosen = Object.entries(INTENT_TIER)
    .filter(([, val]) => val === t[0])
    .map(([code]) => code);
  return advertiseIntents(chosen, roles);
}

// ──────────────────────────────────────────────────────────────────────────────
// Delivery demultiplexer – attach at module evaluation time
// ──────────────────────────────────────────────────────────────────────────────
const RESPONSE_SUBSCRIBERS = new Set();

function subscribeResponses(handler) {
  if (typeof handler !== 'function') return () => {};
  RESPONSE_SUBSCRIBERS.add(handler);
  return () => { RESPONSE_SUBSCRIBERS.delete(handler); };
}

self.addEventListener('delivery', evt => {
  (async () => {
    try {
      if (!evt.data) return;
      const up = await self.unpackMessage(evt.data);
      if (!up?.success) return;
      const msg = JSON.parse(up.message);
      try { console.log('[SW:intents:demux] delivery', { type: msg?.type, from: msg?.from, subs: RESPONSE_SUBSCRIBERS.size }); } catch {}
      // Fan out to current subscribers
      for (const fn of Array.from(RESPONSE_SUBSCRIBERS)) {
        try { fn(msg); } catch {}
      }
    } catch {}
  })();
});

export function makeIntentRequestBody(actionKeyOrCode, params = {}, options = {}) {
  // Backwards compatible builder: no goalCode; caller must send with request type.
  toActionCode(actionKeyOrCode); // validate
  const body = {
    params: params || {},
    ...(options.constraints ? { constraints: options.constraints } : {}),
    ...(options.display ? { display: options.display } : {}),
    return: {
      expect: options.expect || 'result',
      progress: options.progress !== false,
      ...(options.deadline_ms ? { deadline_ms: options.deadline_ms } : {})
    },
    ...(options.origin ? { origin: options.origin } : {}),
    ...(options.ttl_ms ? { ttl_ms: options.ttl_ms } : {}),
    ...(options.idempotency_key ? { idempotency_key: options.idempotency_key } : {})
  };
  return body;
}

// ──────────────────────────────────────────────────────────────────────────────
// Intent discovery via discover-features (treat action request message types as protocol features)
// ──────────────────────────────────────────────────────────────────────────────
export async function discoverIntentProviders(matchers = ['*'], timeoutMs = 400) {
  const toMatch = (s) => {
    const str = String(s || '*');
    if (str === '*') return `${APP_INTENT_BASE}/*-request`;
    if (str.includes('://')) return str; // already a PIURI pattern
    try { return actionToRequestType(toActionCode(str)); } catch { return str; }
  };

  const toQuery = (item) => {
    if (typeof item === 'string') {
      return { ['feature-type']: 'message-type', match: toMatch(item) };
    }
    if (item && typeof item === 'object') {
      const ft = item['feature-type'] || item.feature_type || item.featureType || 'message-type';
      const match = item.match != null ? item.match : (item.id != null ? item.id : '*');
      return { ['feature-type']: String(ft), match: String(match) };
    }
    return { ['feature-type']: 'message-type', match: toMatch('*') };
  };

  const queries = (Array.isArray(matchers) ? matchers : ['*']).map(toQuery);

  const body = { queries };

  const packed = await self.packMessage(
    'did:all:all',
    'https://didcomm.org/discover-features/2.0/queries',
    JSON.stringify(body),
    [],
    ""
  );
  if (!packed?.success) return {};

  try { await sendMessage('did:all:all', packed.message); } catch {}

  return await new Promise(resolve => {
    const out = {};
    const unsub = subscribeResponses(msg => {
      try {
        if (msg?.type !== 'https://didcomm.org/discover-features/2.0/disclose') return;
        const peer = msg.from;
        const disclosures = Array.isArray(msg?.body?.disclosures)
          ? msg.body.disclosures
          : (Array.isArray(msg?.body?.features) ? msg.body.features : []);
        const intentCaps = disclosures.filter(f => {
          const ft = f?.['feature-type'] || f?.feature_type || f?.featureType;
          const id = String(f?.id || '');
          return ft === 'message-type' && id.startsWith(APP_INTENT_BASE + '/') && id.endsWith('-request');
        });
        if (peer && intentCaps.length) { out[peer] = intentCaps; }
      } catch {}
    });
    setTimeout(() => { try { unsub(); } catch {} resolve(out); }, timeoutMs);
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Request/Response helpers
// ──────────────────────────────────────────────────────────────────────────────
export async function requestIntent(destDid, reqBody, opts = {}) {
  validateRequest(reqBody);

  // Determine request message type
  const requestType = String(opts.requestType || reqBody._requestType || '');
  if (!requestType) {
    throw new Error('requestType is required for app-intent request');
  }

  const waitForResult = opts.waitForResult !== false;
  const timeoutMs = Number(opts.timeoutMs || reqBody?.return?.deadline_ms || 15000);
  const onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : null;
  // Derive action and paired response type for terminal result
  const action = requestTypeToAction(requestType);
  const expectedResponseType = action ? actionToResponseType(action) : '';

  if (!waitForResult) {
    const packed = await self.packMessage(destDid, requestType, JSON.stringify(reqBody), [], "");
    if (!packed?.success) return { success: false, error: 'pack-failed', details: packed };
    try { await sendMessage(destDid, packed.message); return { success: true, sent: true }; } catch (err) {
      return { success: false, error: 'send-failed', details: String(err) };
    }
  }

  return await new Promise(async resolve => {
    const startedAt = Date.now();
    try { console.log('[SW:intents:req] subscribing before send', { dest: destDid, type: requestType }); } catch {}

    let settled = false;
    const unsubscribe = subscribeResponses(msg => {
      if (settled) return;
      try {
        try { console.log('[SW:intents:req] delivery', { from: msg?.from, type: msg?.type }); } catch {}
        if (msg?.type === TYPES.progress && onProgress) {
          try { console.log('[SW:intents:req] progress', msg.body || {}); } catch {}
          onProgress(msg.body || {});
          return;
        }
        if (expectedResponseType && msg?.type === expectedResponseType) {
          try { console.log('[SW:intents:req] response', msg.body || {}); } catch {}
          settled = true; try { unsubscribe(); } catch {}
          resolve({ success: true, response: msg.body || {}, took_ms: Date.now() - startedAt });
        } else if (msg?.type && responseTypeToAction && responseTypeToAction(msg.type)) {
          // Any app-intent response for this family (fallback)
          settled = true; try { unsubscribe(); } catch {}
          resolve({ success: true, response: msg.body || {}, took_ms: Date.now() - startedAt });
        } else if (msg?.type?.endsWith('/accept')) {
          // Back-compat: old generic accept
          try { console.log('[SW:intents:req] accept (legacy)', msg.body || {}); } catch {}
          settled = true; try { unsubscribe(); } catch {}
          resolve({ success: true, accept: msg.body || {}, took_ms: Date.now() - startedAt });
        } else if (msg?.type === TYPES.decline || msg?.type?.endsWith('/decline')) {
          try { console.log('[SW:intents:req] decline', msg.body || {}); } catch {}
          settled = true; try { unsubscribe(); } catch {}
          resolve({ success: false, decline: msg.body || {}, took_ms: Date.now() - startedAt });
        }
      } catch {}
    });

    // Now pack and send after subscription to avoid race
    const packed = await self.packMessage(destDid, requestType, JSON.stringify(reqBody), [], "");
    if (!packed?.success) {
      try { unsubscribe(); } catch {}
      resolve({ success: false, error: 'pack-failed', details: packed });
      return;
    }
    try {
      await sendMessage(destDid, packed.message);
      try { console.log('[SW:intents:req] awaiting result', { dest: destDid, type: requestType, timeoutMs }); } catch {}
    } catch (err) {
      try { unsubscribe(); } catch {}
      resolve({ success: false, error: 'send-failed', details: String(err) });
      return;
    }

    setTimeout(() => {
      if (settled) return;
      try { console.warn('[SW:intents:req] timeout'); } catch {}
      settled = true; try { unsubscribe(); } catch {}
      resolve({ success: false, error: 'timeout' });
    }, timeoutMs);
  });
}

// Deprecated: generic accept; use action-specific responses instead.
export async function sendAccept(destDid, result = {}, receipt = undefined) {
  console.log('sendAccept (deprecated)', destDid, result, receipt);
  const body = { status: 'ok', result, ...(receipt ? { receipt } : {}) };
  // Back-compat only: use decline/progress/cancel path for signals; no generic accept type now
  return false;
}

export async function sendDecline(destDid, reason = 'not_supported', detail = '', retry_after_ms = undefined) {
  console.log('sendDecline', destDid, reason, detail, retry_after_ms);
  const body = { reason, ...(detail ? { detail } : {}), ...(retry_after_ms ? { retry_after_ms } : {}) };
  const packed = await self.packMessage(destDid, TYPES.decline, JSON.stringify(body), [], "");
  if (!packed?.success) return false;
  try { await sendMessage(destDid, packed.message); return true; } catch { return false; }
}

export async function sendProgress(destDid, stage = '', percent = undefined, message = undefined) {
  const body = { ...(stage ? { stage } : {}), ...(typeof percent === 'number' ? { percent } : {}), ...(message ? { message } : {}) };
  const packed = await self.packMessage(destDid, TYPES.progress, JSON.stringify(body), [], "");
  if (!packed?.success) return false;
  try { await sendMessage(destDid, packed.message); return true; } catch { return false; }
}

export function installIntentRouter(handlers = {}) {
  const onRequest = typeof handlers.onRequest === 'function' ? handlers.onRequest : null;
  const onCancel = typeof handlers.onCancel === 'function' ? handlers.onCancel : null;

  self.addEventListener('delivery', evt => {
    const promise = (async () => {
      try {
        console.log('intentRouter', 'delivery', evt);
        if (!evt.data) return;
        const up = await self.unpackMessage(evt.data);
        console.log('intentRouter', 'unpackMessage', up);
        if (!up?.success) return;
        const msg = JSON.parse(up.message);
        console.log('intentRouter', 'msg', msg);
        if (!msg?.type || !msg?.from) return;

        const maybeAction = requestTypeToAction(msg.type);
        if (maybeAction && onRequest) {
          try {
            const outcome = await onRequest(msg);
            const dest = msg.from;
            console.log('intentRouter', 'outcome', outcome);
            if (outcome && (outcome.accept || outcome.response)) {
              const result = (outcome.result || (outcome.response && outcome.response.result) || {});
              await sendActionResponse(dest, maybeAction, result, outcome.receipt);
            } else if (outcome && outcome.decline) {
              const d = outcome.decline;
              await sendDecline(dest, d.reason || 'not_supported', d.detail, d.retry_after_ms);
            }
          } catch (err) {
            console.error('intentRouter', 'error', err);
          }
        } else if (msg.type === TYPES.cancel) {
          onCancel?.(msg);
        }
      } catch (err) {
        console.error('intentRouter', 'error', err);
      }
    })();

    // Ensure SW stays alive while awaiting async work, including user prompts
    try { evt.waitUntil(promise); } catch {}
  });
}

// Send action-specific response per App-Intent 1.0
export async function sendActionResponse(destDid, actionKeyOrCode, result = {}, receipt = undefined) {
  const responseType = actionToResponseType(actionKeyOrCode);
  const body = { status: 'ok', ...(result ? { result } : {}), ...(receipt ? { receipt } : {}) };
  const packed = await self.packMessage(destDid, responseType, JSON.stringify(body), [], "");
  if (!packed?.success) return false;
  try { await sendMessage(destDid, packed.message); return true; } catch { return false; }
}

// ──────────────────────────────────────────────────────────────────────────────
// Validation (lightweight; not full JSON Schema)
// ──────────────────────────────────────────────────────────────────────────────
function validateRequest(req) {
  if (!req || typeof req !== 'object') throw new Error('request body must be an object');
  if (req.params && typeof req.params !== 'object') throw new Error('params must be an object');
  if (req.constraints && typeof req.constraints !== 'object') throw new Error('constraints must be an object');
  if (req.display && typeof req.display !== 'object') throw new Error('display must be an object');
  if (req.return && typeof req.return !== 'object') throw new Error('return must be an object');
  if (req.origin && typeof req.origin !== 'object') throw new Error('origin must be an object');
  if (req.ttl_ms && typeof req.ttl_ms !== 'number') throw new Error('ttl_ms must be a number');
  if (req.idempotency_key && typeof req.idempotency_key !== 'string') throw new Error('idempotency_key must be a string');

  // defaults
  req.return = req.return || { expect: 'result', progress: true };
  if (!('expect' in req.return)) req.return.expect = 'result';
  if (!('progress' in req.return)) req.return.progress = true;
}


