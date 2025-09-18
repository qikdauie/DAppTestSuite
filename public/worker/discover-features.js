/*
 * Discover Features 2.0 — Feature advertisement & discovery helpers for Service Worker (ESM)
 *
 * Exports:
 *   - advertiseFeature(featureType, id, roles?)
 *   - discoverFeatures(matchers?, timeoutMs?) → Promise<Record<peerDid, Feature[]>>
 *   - installFeatureAutoResponder(getMyDid: () => string | null)
 */

// ──────────────────────────────────────────────────────────────────────────────
// Utilities (local to library)
// ──────────────────────────────────────────────────────────────────────────────
function buildQueryBody(matchers = []) {
  const toQuery = (item) => {
    // Support string shorthand and full object form
    if (typeof item === 'string') {
      return { ['feature-type']: 'protocol', match: item };
    }
    if (item && typeof item === 'object') {
      const ft = item['feature-type'] || item.feature_type || item.featureType || 'protocol';
      const match = item.match != null ? item.match : (item.id != null ? item.id : '*');
      return { ['feature-type']: String(ft), match: String(match) };
    }
    // Fallback to wildcard protocol query
    return { ['feature-type']: 'protocol', match: '*' };
  };
  const queries = (Array.isArray(matchers) ? matchers : [matchers]).map(toQuery);
  return { queries };
}

function isDisclosePacket(msg) {
  return msg?.type === 'https://didcomm.org/discover-features/2.0/disclose';
}

function extractFeatures(msg) {
  if (Array.isArray(msg?.body?.disclosures)) return msg.body.disclosures;
  if (Array.isArray(msg?.body?.features)) return msg.body.features; // legacy fallback
  return [];
}

function logDev(...args) { console.log('[peerDiscovery]', ...args); }
function logErr(...args) { console.error('[peerDiscovery]', ...args); }

function globToRegExp(glob) {
  const escaped = String(glob)
    .replace(/[.+^${}()|\[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp('^' + escaped + '$');
}

function globTest(pattern, value) {
  try {
    const regex = globToRegExp(pattern);
    return regex.test(String(value));
  } catch {
    return false;
  }
}

function matchFeatures(localFeatures, queries) {
  if (!Array.isArray(localFeatures) || !Array.isArray(queries)) return [];
  const results = [];
  for (const feature of localFeatures) {
    for (const query of queries) {
      const queryType = query?.['feature-type'] || query?.feature_type || query?.featureType || 'protocol';
      const pattern = query?.match || query?.id || '';
      if (!pattern) continue;
      if (queryType !== feature.featureType) continue;
      if (globTest(pattern, feature.id)) {
        results.push(feature);
        break;
      }
    }
  }
  return results;
}

// ──────────────────────────────────────────────────────────────────────────────
// Feature advertise / discover
// ──────────────────────────────────────────────────────────────────────────────
const FEATURES = new Map(); // id → {featureType,id,roles[]}

export function advertiseFeature(featureType, id, roles = []) {
  // Allow spec-defined feature types per Discover-Features 2.0:
  // - 'protocol' (legacy/general)
  // - 'goal-code' (legacy)
  // - 'message-type' (recommended for advertising DIDComm message types)
  const ft = String(featureType);
  if (ft !== 'protocol' && ft !== 'goal-code' && ft !== 'message-type') {
    throw new Error(`Unsupported feature-type: ${featureType}`);
  }
  FEATURES.set(id, { featureType: ft, id, roles });
}

export async function discoverFeatures(matchers = [], timeout = 400) {
  const body = buildQueryBody(matchers);

  const packed = await self.packMessage(
    'did:all:all',
    'https://didcomm.org/discover-features/2.0/queries',
    JSON.stringify(body),
    [],
    ""
  );

  if (!packed?.success) {
    logErr('discoverFeatures: packMessage failed', packed);
    return {};
  }

  try {
    await sendMessage('did:all:all', packed.message);
    logDev('discoverFeatures: broadcasted query', body);
  } catch (err) {
    logErr('discoverFeatures: broadcast failed', err);
  }

  return await new Promise(resolve => {
    const featureMap = {};

    const listener = async evt => {
      if (!evt.data) return;
      const unpack = await self.unpackMessage(evt.data);
      if (!unpack.success) {
        logErr('discoverFeatures: unpack failed', unpack);
        return;
      }

      let msg;
      try {
        msg = JSON.parse(unpack.message);
      } catch (err) {
        logErr('discoverFeatures: JSON parse error', err);
        return;
      }

      if (!isDisclosePacket(msg)) return;

      const peer = msg.from;
      const features = extractFeatures(msg);
      if (peer && Array.isArray(features)) {
        featureMap[peer] = features;
        logDev('discoverFeatures: got disclose', peer, features);
      }
    };

    self.addEventListener('delivery', listener);

    setTimeout(() => {
      self.removeEventListener('delivery', listener);
      logDev('discoverFeatures: resolve with', featureMap);
      resolve(featureMap);
    }, timeout);
  });
}

export function installFeatureAutoResponder(getMyDid) {
  self.addEventListener('delivery', (evt) => {
    (async () => {
      try {
        if (!evt.data) return;
        const unpack = await self.unpackMessage(evt.data);
        if (!unpack?.success) return;

        let msg;
        try { msg = JSON.parse(unpack.message); } catch { return; }
        if (msg?.type !== 'https://didcomm.org/discover-features/2.0/queries') return;

        const callerDid = msg.from;
        // Ignore own broadcast or missing from
        const myDid = typeof getMyDid === 'function' ? getMyDid() : undefined;
        if (!callerDid || (myDid && callerDid === myDid)) return;

        const queries = Array.isArray(msg?.body?.queries) ? msg.body.queries : [];
        const featuresArray = Array.from(FEATURES.values());
        const matched = matchFeatures(featuresArray, queries);
        if (!matched.length) return;

        const discloseBody = {
          disclosures: matched.map(f => ({ ['feature-type']: f.featureType, id: f.id, roles: f.roles }))
        };

        const packed = await self.packMessage(
          callerDid,
          'https://didcomm.org/discover-features/2.0/disclose',
          JSON.stringify(discloseBody),
          [],
          ""
        );
        if (!packed?.success) return;
        await sendMessage(callerDid, packed.message);
      } catch (err) {
        logErr('auto-disclose failed', err);
      }
    })();
  });
}
