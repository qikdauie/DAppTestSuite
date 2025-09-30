import { getReadyDecentClient } from 'decent_app_sdk';

const withTimeout = (p, ms, msg = 'Timeout') => new Promise((res) => {
  let t = setTimeout(() => res({ pass: false, ready: false, error: msg }), ms);
  p.then(v => { clearTimeout(t); res(v); }).catch(e => { clearTimeout(t); res({ pass: false, ready: false, error: String(e) }); });
});

export async function ensureSDKReady() {
  return withTimeout((async () => {
    try {
      const msgr = await getReadyDecentClient();
      try { await msgr.protocols.refresh(); } catch {}
      return { pass: true, ready: true };
    } catch (err) {
      return { pass: false, ready: false, error: String(err?.message || err) };
    }
  })(), 15000, 'SDK readiness timeout');
}

export async function checkEnvironmentReadiness() {
  const hasNavigator = typeof navigator !== 'undefined';
  const hasServiceWorker = hasNavigator && !!navigator.serviceWorker;
  const hasWindow = typeof window !== 'undefined';
  const hasCrypto = hasWindow && !!(window.crypto && window.crypto.subtle);

  let swState = { available: hasServiceWorker, controller: null, registrations: null };
  if (hasServiceWorker) {
    try { swState.controller = !!navigator.serviceWorker.controller; } catch {}
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      swState.registrations = Array.isArray(regs) ? regs.length : 0;
    } catch {}
  }

  const sdk = await ensureSDKReady();

  // Custom browser DIDComm API heuristics (environment-specific; best-effort)
  const customApis = {
    hasNavigator,
    hasServiceWorker,
    hasCrypto,
  };

  const pass = swState.available === true && sdk.pass === true;
  return {
    pass,
    serviceWorker: swState,
    sdk,
    browserApis: customApis,
    location: hasWindow ? String(window.location?.origin || '') : '',
    userAgent: hasNavigator ? String(navigator.userAgent || '') : ''
  };
}

export async function getEnvironmentInfo() {
  const env = await checkEnvironmentReadiness();
  return { pass: env.pass, ...env };
}


