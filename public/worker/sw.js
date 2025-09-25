import { initServiceWorker } from 'decent_app_sdk/service-worker';

// In-SW UI prompt coordination
const pendingUi = new Map(); // correlationId -> { resolve }

function actionFromType(type) {
  try {
    const base = 'https://didcomm.org/app-intent/1.0/';
    const suffix = '-request';
    if (!type || !type.startsWith(base) || !type.endsWith(suffix)) return '';
    return type.slice(base.length, type.length - suffix.length);
  } catch { return ''; }
}

async function promptUiAndAwait(correlationId, action, params, timeoutMs = 8000) {
  try {
    const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clientsList) {
      try {
        client.postMessage({ kind: 'intent-ui-request', correlationId, payload: { action, params } });
      } catch {}
    }
  } catch {}
  return new Promise((resolve) => {
    const timer = setTimeout(() => { pendingUi.delete(correlationId); resolve(null); }, timeoutMs);
    pendingUi.set(correlationId, { resolve: (value) => { clearTimeout(timer); pendingUi.delete(correlationId); resolve(value); } });
  });
}

self.addEventListener('message', (evt) => {
  try {
    const data = evt?.data || {};
    if (data.kind !== 'intentUiResponse') return;
    const cid = data?.data?.correlationId;
    const payload = data?.data?.payload;
    if (!cid || !pendingUi.has(cid)) return;
    const entry = pendingUi.get(cid);
    entry?.resolve?.(payload);
  } catch {}
});

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
        const correlationId = envelope?.correlationId || '';
        const params = (envelope?.body && envelope.body.params) || {};

        // Always prompt UI; if no response, decline instead of auto-canning
        const ui = await promptUiAndAwait(correlationId, action, params, 120000);
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
