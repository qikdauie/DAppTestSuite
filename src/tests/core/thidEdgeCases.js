import { getReadyDecentClient } from 'decent_app_sdk';
import { MessageTypes } from 'decent_app_sdk/constants';
import { extractThid } from '../../../submodules/decent_app_sdk/src/utils/message-helpers.js';

export async function thidWithEmptyReplyToTest() {
  const msgr = await getReadyDecentClient();
  try { await msgr.protocols.refresh(); } catch {}
  try {
    const did = (await msgr.getDID()).did;
    const a = await msgr.pack(did, MessageTypes.BASIC_MESSAGE.MESSAGE, JSON.stringify({ t: 1 }), [], "");
    const ua = await msgr.unpack(a.message);
    const thid1 = a?.thid || '';
    const unpackedThid1 = extractThid(ua?.message) || '';
    const b = await msgr.pack(did, MessageTypes.BASIC_MESSAGE.MESSAGE, JSON.stringify({ t: 2 }), [], "");
    const ub = await msgr.unpack(b.message);
    const thid2 = b?.thid || '';
    const unpackedThid2 = extractThid(ub?.message) || '';
    const pass = a?.success && b?.success && thid1 !== thid2 && thid1 === unpackedThid1 && thid2 === unpackedThid2;
    return { pass, thid1, thid2, different: thid1 !== thid2 };
  } catch (err) {
    return { pass: false, error: String(err?.message || err) };
  }
}

export async function thidWithNullReplyToTest() {
  const msgr = await getReadyDecentClient();
  try { await msgr.protocols.refresh(); } catch {}
  try {
    const did = (await msgr.getDID()).did;
    const a = await msgr.pack(did, MessageTypes.BASIC_MESSAGE.MESSAGE, JSON.stringify({ t: 'null' }), [], undefined);
    const ua = await msgr.unpack(a.message);
    const thid = a?.thid || '';
    const unpackedThid = extractThid(ua?.message) || '';
    const pass = a?.success && ua?.success && thid.length > 0 && thid === unpackedThid;
    return { pass, thid, unpackedThid, matches: thid === unpackedThid };
  } catch (err) {
    return { pass: false, error: String(err?.message || err) };
  }
}

export async function thidWithMalformedReplyToTest() {
  const msgr = await getReadyDecentClient();
  try { await msgr.protocols.refresh(); } catch {}
  try {
    const did = (await msgr.getDID()).did;
    let behavior = 'unknown';
    let detail = null;
    try {
      const res = await msgr.pack(did, MessageTypes.BASIC_MESSAGE.MESSAGE, JSON.stringify({ t: 'bad' }), [], '{not valid json}');
      // If it did not throw, we consider it new thid behavior
      behavior = res?.success ? 'new_thid' : 'rejected';
      detail = res;
      if (res?.success) {
        const u = await msgr.unpack(res.message);
        const unpackedThid = extractThid(u?.message) || '';
        return { pass: unpackedThid?.length > 0, behavior, detail: { res, u, unpackedThid } };
      }
    } catch (e) {
      behavior = 'rejected';
      detail = { error: String(e?.message || e) };
    }
    return { pass: true, behavior, detail };
  } catch (err) {
    return { pass: false, error: String(err?.message || err) };
  }
}

export async function thidWithPartialEnvelopeReplyToTest() {
  const msgr = await getReadyDecentClient();
  try { await msgr.protocols.refresh(); } catch {}
  try {
    const did = (await msgr.getDID()).did;
    const partial = { type: MessageTypes.BASIC_MESSAGE.MESSAGE, body: {} };
    const res = await msgr.pack(did, MessageTypes.BASIC_MESSAGE.MESSAGE, JSON.stringify({ t: 'partial' }), [], JSON.stringify(partial));
    if (!res?.success) return { pass: false, error: 'pack failed', detail: { res } };
    const u = await msgr.unpack(res.message);
    const unpackedThid = extractThid(u?.message) || '';
    const pass = typeof res?.thid === 'string' && res.thid.length > 0 && res.thid === unpackedThid;
    return { pass, generatedNewThid: true, thid: res.thid || '', unpackedThid };
  } catch (err) {
    return { pass: false, error: String(err?.message || err) };
  }
}

export async function thidConsistencyAcrossMultipleUnpacksTest() {
  const msgr = await getReadyDecentClient();
  try { await msgr.protocols.refresh(); } catch {}
  try {
    const did = (await msgr.getDID()).did;
    const res = await msgr.pack(did, MessageTypes.BASIC_MESSAGE.MESSAGE, JSON.stringify({ t: 'multi' }), [], "");
    const thid = res?.thid || '';
    const unpacks = [];
    for (let i = 0; i < 5; i++) {
      unpacks.push(await msgr.unpack(res.message));
    }
    const extracted = unpacks.map(u => extractThid(u?.message) || '');
    const allMatch = extracted.every(x => x === thid && x.length > 0);
    const pass = res?.success && allMatch;
    return { pass, thid, unpackCount: 5, allMatch };
  } catch (err) {
    return { pass: false, error: String(err?.message || err) };
  }
}

export async function thidWithVeryLongConversationChainTest() {
  const msgr = await getReadyDecentClient();
  try { await msgr.protocols.refresh(); } catch {}
  try {
    const did = (await msgr.getDID()).did;
    const first = await msgr.pack(did, MessageTypes.BASIC_MESSAGE.MESSAGE, JSON.stringify({ i: 0 }), [], "");
    if (!first?.success) return { pass: false, error: 'pack first failed', detail: { first } };
    const uf = await msgr.unpack(first.message);
    const env = JSON.parse(uf.message);
    const thid = extractThid(env) || '';
    const msgs = [first];
    const unpacks = [uf];
    let prevEnv = env;
    for (let i = 1; i < 10; i++) {
      const m = await msgr.pack(did, MessageTypes.BASIC_MESSAGE.MESSAGE, JSON.stringify({ i }), [], JSON.stringify(prevEnv));
      if (!m?.success) return { pass: false, error: `pack m${i} failed`, detail: { m } };
      msgs.push(m);
      const u = await msgr.unpack(m.message);
      unpacks.push(u);
      prevEnv = JSON.parse(u.message);
    }
    const unpackedThids = unpacks.map(u => extractThid(u?.message) || '');
    const allMatched = unpackedThids.every(x => x === thid && x.length > 0) && msgs.every(m => m?.thid === thid);
    const pass = allMatched;
    return { pass, messageCount: msgs.length, thid, allMatched };
  } catch (err) {
    return { pass: false, error: String(err?.message || err) };
  }
}

export async function thidWithConcurrentMessagesTest() {
  const msgr = await getReadyDecentClient();
  try { await msgr.protocols.refresh(); } catch {}
  try {
    const did = (await msgr.getDID()).did;
    const bodies = Array.from({ length: 6 }).map((_, i) => JSON.stringify({ i }));
    const packed = await Promise.all(bodies.map(b => msgr.pack(did, MessageTypes.BASIC_MESSAGE.MESSAGE, b, [], "")));
    const thids = packed.map(p => p?.thid || '');
    const uniqueThids = Array.from(new Set(thids)).length === thids.length;
    const unpacks = await Promise.all(packed.map(p => msgr.unpack(p.message)));
    const unpackedThids = unpacks.map(u => extractThid(u?.message) || '');
    const allPreserved = thids.every((t, i) => t === unpackedThids[i] && t.length > 0);
    const pass = uniqueThids && allPreserved;
    return { pass, messageCount: bodies.length, uniqueThids, allPreserved };
  } catch (err) {
    return { pass: false, error: String(err?.message || err) };
  }
}

export async function extractThidWithVariousFormatsTest() {
  try {
    const results = {
      v2: extractThid({ thid: 'abc' }),
      v2pthid: extractThid({ pthid: 'xyz' }),
      v1: extractThid({ '~thread': { thid: 'def' } }),
      v1pthid: extractThid({ '~thread': { pthid: 'uvw' } }),
      both: extractThid({ thid: 'abc', '~thread': { thid: 'def' } }),
    };
    const pass = results.v2 === 'abc' && results.v2pthid === 'xyz' && results.v1 === 'def' && results.v1pthid === 'uvw' && results.both === 'abc';
    return { pass, results };
  } catch (err) {
    return { pass: false, error: String(err?.message || err) };
  }
}

export async function thidWithSpecialCharactersTest() {
  const msgr = await getReadyDecentClient();
  try { await msgr.protocols.refresh(); } catch {}
  try {
    const did = (await msgr.getDID()).did;
    const m = await msgr.pack(did, MessageTypes.BASIC_MESSAGE.MESSAGE, JSON.stringify({ text: 'chars' }), [], "");
    const u = await msgr.unpack(m.message);
    const thid = m?.thid || '';
    const unpackedThid = extractThid(u?.message) || '';
    // Basic sanity checks for URL/JSON safety (no spaces/quotes)
    const isSafe = thid.length > 0 && !/[\s"'<>]/.test(thid);
    const pass = m?.success && u?.success && isSafe && thid === unpackedThid;
    return { pass, thid, isSafe, unpackedThid };
  } catch (err) {
    return { pass: false, error: String(err?.message || err) };
  }
}

export async function thidEdgeCasesTests() {
  const results = {};
  try { results.thidWithEmptyReplyTo = await thidWithEmptyReplyToTest(); } catch (err) { results.thidWithEmptyReplyTo = { pass: false, error: err?.message || String(err) }; }
  try { results.thidWithNullReplyTo = await thidWithNullReplyToTest(); } catch (err) { results.thidWithNullReplyTo = { pass: false, error: err?.message || String(err) }; }
  try { results.thidWithMalformedReplyTo = await thidWithMalformedReplyToTest(); } catch (err) { results.thidWithMalformedReplyTo = { pass: false, error: err?.message || String(err) }; }
  try { results.thidWithPartialEnvelopeReplyTo = await thidWithPartialEnvelopeReplyToTest(); } catch (err) { results.thidWithPartialEnvelopeReplyTo = { pass: false, error: err?.message || String(err) }; }
  try { results.thidConsistencyAcrossMultipleUnpacks = await thidConsistencyAcrossMultipleUnpacksTest(); } catch (err) { results.thidConsistencyAcrossMultipleUnpacks = { pass: false, error: err?.message || String(err) }; }
  try { results.thidWithVeryLongConversationChain = await thidWithVeryLongConversationChainTest(); } catch (err) { results.thidWithVeryLongConversationChain = { pass: false, error: err?.message || String(err) }; }
  try { results.thidWithConcurrentMessages = await thidWithConcurrentMessagesTest(); } catch (err) { results.thidWithConcurrentMessages = { pass: false, error: err?.message || String(err) }; }
  try { results.extractThidWithVariousFormats = await extractThidWithVariousFormatsTest(); } catch (err) { results.extractThidWithVariousFormats = { pass: false, error: err?.message || String(err) }; }
  try { results.thidWithSpecialCharacters = await thidWithSpecialCharactersTest(); } catch (err) { results.thidWithSpecialCharacters = { pass: false, error: err?.message || String(err) }; }
  const pass = Object.values(results).every(r => r && r.pass === true);
  return { pass, results };
}


