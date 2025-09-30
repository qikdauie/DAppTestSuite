import { initServiceWorker } from 'decent_app_sdk/service-worker';

// In-SW UI prompt coordination
const pendingUi = new Map(); // thid -> { resolve }

function actionFromType(type) {
  try {
    const base = 'https://didcomm.org/app-intent/1.0/';
    const suffix = '-request';
    if (!type || !type.startsWith(base) || !type.endsWith(suffix)) return '';
    return type.slice(base.length, type.length - suffix.length);
  } catch { return ''; }
}

function extractThid(msg) {
  try {
    const m = typeof msg === 'string' ? JSON.parse(msg) : (msg || {});
    const topLevelThid = typeof m?.thid === 'string' ? m.thid : null;
    const topLevelPthid = typeof m?.pthid === 'string' ? m.pthid : null;
    if (topLevelThid || topLevelPthid) return topLevelThid || topLevelPthid || '';
    const thread = m['~thread'] || {};
    const thid = thread?.thid;
    const pthid = thread?.pthid;
    return (typeof thid === 'string' && thid) || (typeof pthid === 'string' && pthid) || '';
  } catch { return ''; }
}

async function promptUiAndAwait(thid, action, params, timeoutMs = 8000) {
  try {
    const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clientsList) {
      try {
        client.postMessage({ kind: 'intent-ui-request', thid, payload: { action, params } });
        try { console?.log?.('[SW] intent-ui-request posted to client', { clientId: String(client.id || ''), action, thid }); } catch {}
      } catch {}
    }
  } catch {}
  return new Promise((resolve) => {
    const timer = setTimeout(() => { pendingUi.delete(thid); try { console?.warn?.('[SW] intent-ui-response timeout', { thid }); } catch {} resolve(null); }, timeoutMs);
    pendingUi.set(thid, { resolve: (value) => { clearTimeout(timer); pendingUi.delete(thid); resolve(value); } });
  });
}

self.addEventListener('message', (evt) => {
  try {
    const data = evt?.data || {};
    if (data.kind !== 'intentUiResponse') return;
    const tid = data?.data?.thid;
    const payload = data?.data?.payload;
    if (!tid || !pendingUi.has(tid)) return;
    const entry = pendingUi.get(tid);
    try { console?.log?.('[SW] intent-ui-response received', { thid: tid, hasPayload: payload != null }); } catch {}
    entry?.resolve?.(payload);
  } catch {}
});

// Ensure SW takes control immediately on first load and updates activate quickly
try {
  self.addEventListener('install', (event) => {
    try { console?.log?.('[SW] installing and skipping waiting'); } catch {}
    try { event?.waitUntil?.(self.skipWaiting()); } catch { try { self.skipWaiting?.(); } catch {} }
  });
} catch {}

try {
  self.addEventListener('activate', (event) => {
    try { console?.log?.('[SW] activated and claiming clients'); } catch {}
    try { event?.waitUntil?.(self.clients.claim()); } catch { try { self.clients.claim?.(); } catch {} }
  });
} catch {}

// Initialize Service Worker with built-in protocols and canned intent handlers for tests
initServiceWorker({
  builtInProtocols: true,
  autoUnpack: true,
  deliveryStrategy: 'broadcast',
  appIntents: {
    router: {
      async onRequest(envelope) {
        const type = envelope?.type || '';
        const action = actionFromType(type);
        const thid = extractThid(envelope?.raw || envelope) || '';
        const params = (envelope?.body && envelope.body.params) || {};

        // Always prompt UI; if no response, decline instead of auto-canning
        const ui = await promptUiAndAwait(thid, action, params, 120000);
        if (ui == null) {
          return { decline: { reason: 'timeout', retry_after_ms: 0 } };
        }
        return { accept: true, response: { result: ui } };
      },
      onCancel() {}
    },
    roles: ['provider'],
    advertise: true,
  },
});


