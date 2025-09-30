import { getReadyDecentClient } from 'decent_app_sdk';
import { MessageTypes } from 'decent_app_sdk/constants';
import { extractThid } from '../../../submodules/decent_app_sdk/src/utils/message-helpers.js';

export async function basicThidTest() {
  const msgr = await getReadyDecentClient();
  try { await msgr.protocols.refresh(); } catch {}
  try {
    const body = JSON.stringify({ text: 'hello-basic' });
    const packed = await msgr.pack((await msgr.getDID()).did, MessageTypes.BASIC_MESSAGE.MESSAGE, body, [], "");
    const thid = packed?.thid;
    const unpacked = await msgr.unpack(packed.message);
    const unpackedThid = extractThid(unpacked?.message) || '';
    const thidMatches = typeof thid === 'string' && thid.length > 0 && thid === unpackedThid;
    const pass = packed?.success === true && unpacked?.success === true && thidMatches;
    return { pass, thid: thid || '', unpackedThid, thidMatches, detail: { packed, unpacked } };
  } catch (err) {
    return { pass: false, error: String(err?.message || err) };
  }
}

export async function replyThidTest() {
  const msgr = await getReadyDecentClient();
  try { await msgr.protocols.refresh(); } catch {}
  try {
    const did = (await msgr.getDID()).did;
    // First message: new conversation (browser sets thid)
    const packed1 = await msgr.pack(did, MessageTypes.BASIC_MESSAGE.MESSAGE, JSON.stringify({ text: 'original' }), [], "");
    if (!packed1?.success) return { pass: false, error: 'pack1 failed', detail: { packed1 } };
    const unpacked1 = await msgr.unpack(packed1.message);
    if (!unpacked1?.success) return { pass: false, error: 'unpack1 failed', detail: { unpacked1 } };
    const envelope1 = JSON.parse(unpacked1.message);
    const originalThid = extractThid(envelope1) || '';

    // Reply: provide unpacked envelope as reply_to
    const packed2 = await msgr.pack(did, MessageTypes.BASIC_MESSAGE.MESSAGE, JSON.stringify({ text: 'reply' }), [], JSON.stringify(envelope1));
    const replyThid = packed2?.thid || '';
    const unpacked2 = await msgr.unpack(packed2.message);
    if (!unpacked2?.success) return { pass: false, error: 'unpack2 failed', detail: { unpacked2 } };
    const unpackedThid1 = extractThid(unpacked1.message) || '';
    const unpackedThid2 = extractThid(unpacked2.message) || '';
    const packedVsUnpacked2Match = replyThid === unpackedThid2 && replyThid.length > 0;
    const threadConsistent = unpackedThid1 === unpackedThid2 && unpackedThid1.length > 0;
    const pass = packed2?.success === true && packed1?.success === true && packedVsUnpacked2Match && threadConsistent;
    return { pass, originalThid, replyThid, packedVsUnpacked2Match, threadConsistent, unpackedThid1, unpackedThid2, detail: { packed1, packed2, unpacked1, unpacked2 } };
  } catch (err) {
    return { pass: false, error: String(err?.message || err) };
  }
}

export async function multiMessageConversationTest() {
  const msgr = await getReadyDecentClient();
  try { await msgr.protocols.refresh(); } catch {}
  try {
    const did = (await msgr.getDID()).did;
    // Message 1: start new conversation
    const m1 = await msgr.pack(did, MessageTypes.BASIC_MESSAGE.MESSAGE, JSON.stringify({ text: 'm1' }), [], "");
    if (!m1?.success) return { pass: false, error: 'pack m1 failed', detail: { m1 } };
    const u1 = await msgr.unpack(m1.message);
    if (!u1?.success) return { pass: false, error: 'unpack u1 failed', detail: { u1 } };
    const e1 = JSON.parse(u1.message);
    const thid1 = m1?.thid || '';
    const unpackedThid1 = extractThid(u1.message) || '';

    // Message 2: reply to message 1 using unpacked envelope
    const m2 = await msgr.pack(did, MessageTypes.BASIC_MESSAGE.MESSAGE, JSON.stringify({ text: 'm2' }), [], JSON.stringify(e1));
    if (!m2?.success) return { pass: false, error: 'pack m2 failed', detail: { m2 } };
    const u2 = await msgr.unpack(m2.message);
    if (!u2?.success) return { pass: false, error: 'unpack u2 failed', detail: { u2 } };
    const e2 = JSON.parse(u2.message);
    const thid2 = m2?.thid || '';
    const unpackedThid2 = extractThid(u2.message) || '';

    // Message 3: reply to message 2 using unpacked envelope
    const m3 = await msgr.pack(did, MessageTypes.BASIC_MESSAGE.MESSAGE, JSON.stringify({ text: 'm3' }), [], JSON.stringify(e2));
    if (!m3?.success) return { pass: false, error: 'pack m3 failed', detail: { m3 } };
    const u3 = await msgr.unpack(m3.message);
    if (!u3?.success) return { pass: false, error: 'unpack u3 failed', detail: { u3 } };
    const thid3 = m3?.thid || '';
    const unpackedThid3 = extractThid(u3.message) || '';

    const thids = [thid1, thid2, thid3];
    const unpackedThids = [unpackedThid1, unpackedThid2, unpackedThid3];
    const packVsUnpackConsistent =
      (thid1 === unpackedThid1) &&
      (thid2 === unpackedThid2) &&
      (thid3 === unpackedThid3) &&
      thids.every(t => typeof t === 'string' && t.length > 0) &&
      unpackedThids.every(t => typeof t === 'string' && t.length > 0);
    const threadConsistent = unpackedThid1 === unpackedThid2 && unpackedThid2 === unpackedThid3;
    const pass = m1?.success && m2?.success && m3?.success && packVsUnpackConsistent && threadConsistent;
    return { pass, thids, unpackedThids, packVsUnpackConsistent, threadConsistent, detail: { m1, m2, m3, u1, u2, u3 } };
  } catch (err) {
    return { pass: false, error: String(err?.message || err) };
  }
}

export async function thidErrorHandlingTest() {
  const msgr = await getReadyDecentClient();
  try { await msgr.protocols.refresh(); } catch {}
  const did = (await msgr.getDID()).did;
  let errorsCaught = 0;
  const detail = {};
  try {
    detail.malformed = await msgr.pack(did, MessageTypes.BASIC_MESSAGE.MESSAGE, JSON.stringify({}), [], '{not json');
  } catch { errorsCaught += 1; }
  try {
    detail.noThid = await msgr.pack(did, MessageTypes.BASIC_MESSAGE.MESSAGE, JSON.stringify({}), [], JSON.stringify({ type: MessageTypes.BASIC_MESSAGE.MESSAGE, body: {} }));
  } catch { /* should not throw */ }
  try {
    detail.empty = await msgr.pack(did, MessageTypes.BASIC_MESSAGE.MESSAGE, JSON.stringify({}), [], "");
  } catch { errorsCaught += 1; }
  const pass = errorsCaught <= 1; // graceful handling
  return { pass, errorsCaught, detail };
}

export async function emptyReplyToTest() {
  const msgr = await getReadyDecentClient();
  try { await msgr.protocols.refresh(); } catch {}
  const did = (await msgr.getDID()).did;
  try {
    const a = await msgr.pack(did, MessageTypes.BASIC_MESSAGE.MESSAGE, JSON.stringify({ i: 1 }), [], "");
    const b = await msgr.pack(did, MessageTypes.BASIC_MESSAGE.MESSAGE, JSON.stringify({ i: 2 }), [], "");
    const pass = a?.success && b?.success && a?.thid !== b?.thid;
    return { pass, detail: { a, b } };
  } catch (err) {
    return { pass: false, error: String(err?.message || err) };
  }
}

// New comprehensive tests
export async function thidRoundtripVerificationTest() {
  const msgr = await getReadyDecentClient();
  try { await msgr.protocols.refresh(); } catch {}
  try {
    const did = (await msgr.getDID()).did;
    const body = JSON.stringify({ text: 'roundtrip-1' });
    const m1 = await msgr.pack(did, MessageTypes.BASIC_MESSAGE.MESSAGE, body, [], "");
    if (!m1?.success) return { pass: false, error: 'pack m1 failed', detail: { m1 } };
    const u1 = await msgr.unpack(m1.message);
    if (!u1?.success) return { pass: false, error: 'unpack u1 failed', detail: { u1 } };
    const unpackedThid1 = extractThid(u1.message) || '';
    const m1Matches = m1.thid === unpackedThid1 && m1.thid?.length > 0;

    // Reply using object envelope
    const env1 = JSON.parse(u1.message);
    const m2 = await msgr.pack(did, MessageTypes.BASIC_MESSAGE.MESSAGE, JSON.stringify({ text: 'roundtrip-2' }), [], JSON.stringify(env1));
    if (!m2?.success) return { pass: false, error: 'pack m2 failed', detail: { m2 } };
    const u2 = await msgr.unpack(m2.message);
    if (!u2?.success) return { pass: false, error: 'unpack u2 failed', detail: { u2 } };
    const unpackedThid2 = extractThid(u2.message) || '';
    const m2Matches = m2.thid === unpackedThid2 && m2.thid?.length > 0;
    const sameThread1 = unpackedThid1 === unpackedThid2;

    // Reply using stringified envelope (explicit test, though above already stringifies)
    const m3 = await msgr.pack(did, MessageTypes.BASIC_MESSAGE.MESSAGE, JSON.stringify({ text: 'roundtrip-3' }), [], JSON.stringify(env1));
    if (!m3?.success) return { pass: false, error: 'pack m3 failed', detail: { m3 } };
    const u3 = await msgr.unpack(m3.message);
    if (!u3?.success) return { pass: false, error: 'unpack u3 failed', detail: { u3 } };
    const unpackedThid3 = extractThid(u3.message) || '';
    const m3Matches = m3.thid === unpackedThid3 && m3.thid?.length > 0;
    const sameThread2 = unpackedThid1 === unpackedThid3;

    const pass = m1Matches && m2Matches && m3Matches && sameThread1 && sameThread2;
    return {
      pass,
      details: {
        m1: { packedThid: m1.thid || '', unpackedThid: unpackedThid1, match: m1Matches },
        m2: { packedThid: m2.thid || '', unpackedThid: unpackedThid2, match: m2Matches },
        m3: { packedThid: m3.thid || '', unpackedThid: unpackedThid3, match: m3Matches },
        sameThread1,
        sameThread2,
      }
    };
  } catch (err) {
    return { pass: false, error: String(err?.message || err) };
  }
}

export async function thidFormatCompatibilityTest() {
  const msgr = await getReadyDecentClient();
  try { await msgr.protocols.refresh(); } catch {}
  try {
    const did = (await msgr.getDID()).did;
    const m = await msgr.pack(did, MessageTypes.BASIC_MESSAGE.MESSAGE, JSON.stringify({ text: 'format-check' }), [], "");
    if (!m?.success) return { pass: false, error: 'pack failed', detail: { m } };
    const u = await msgr.unpack(m.message);
    if (!u?.success) return { pass: false, error: 'unpack failed', detail: { u } };
    const env = JSON.parse(u.message);
    const hasV2 = typeof env?.thid === 'string' || typeof env?.pthid === 'string';
    const hasV1 = !!(env['~thread'] && (typeof env['~thread']?.thid === 'string' || typeof env['~thread']?.pthid === 'string'));
    const extracted = extractThid(env) || '';
    const pass = extracted.length > 0 && (hasV2 || hasV1);
    return { pass, detectedFormat: hasV2 ? 'v2' : (hasV1 ? 'v1' : 'unknown'), extracted, detail: { m, u, env } };
  } catch (err) {
    return { pass: false, error: String(err?.message || err) };
  }
}

export async function pthidHandlingTest() {
  const msgr = await getReadyDecentClient();
  try { await msgr.protocols.refresh(); } catch {}
  try {
    const did = (await msgr.getDID()).did;
    const a = await msgr.pack(did, MessageTypes.BASIC_MESSAGE.MESSAGE, JSON.stringify({ text: 'A' }), [], "");
    if (!a?.success) return { pass: false, error: 'pack A failed', detail: { a } };
    const ua = await msgr.unpack(a.message);
    if (!ua?.success) return { pass: false, error: 'unpack A failed', detail: { ua } };
    const envA = JSON.parse(ua.message);
    const thidA = extractThid(envA) || '';

    const b = await msgr.pack(did, MessageTypes.BASIC_MESSAGE.MESSAGE, JSON.stringify({ text: 'B' }), [], JSON.stringify(envA));
    if (!b?.success) return { pass: false, error: 'pack B failed', detail: { b } };
    const ub = await msgr.unpack(b.message);
    if (!ub?.success) return { pass: false, error: 'unpack B failed', detail: { ub } };
    const envB = JSON.parse(ub.message);
    const thidB = extractThid(envB) || '';

    const c = await msgr.pack(did, MessageTypes.BASIC_MESSAGE.MESSAGE, JSON.stringify({ text: 'C' }), [], JSON.stringify(envB));
    if (!c?.success) return { pass: false, error: 'pack C failed', detail: { c } };
    const uc = await msgr.unpack(c.message);
    if (!uc?.success) return { pass: false, error: 'unpack C failed', detail: { uc } };
    const envC = JSON.parse(uc.message);
    const thidC = extractThid(envC) || '';

    const pass = thidA.length > 0 && thidA === thidB && thidB === thidC;
    return { pass, thread: { A: thidA, B: thidB, C: thidC }, detail: { a, b, c, ua, ub, uc } };
  } catch (err) {
    return { pass: false, error: String(err?.message || err) };
  }
}

export async function messageThreadingTests() {
  const results = {};
  try { results.basicThid = await basicThidTest(); } catch (err) { results.basicThid = { pass: false, error: err.message }; }
  try { results.replyThid = await replyThidTest(); } catch (err) { results.replyThid = { pass: false, error: err.message }; }
  try { results.multiMessage = await multiMessageConversationTest(); } catch (err) { results.multiMessage = { pass: false, error: err.message }; }
  try { results.errorHandling = await thidErrorHandlingTest(); } catch (err) { results.errorHandling = { pass: false, error: err.message }; }
  try { results.emptyReplyTo = await emptyReplyToTest(); } catch (err) { results.emptyReplyTo = { pass: false, error: err.message }; }
  try { results.thidRoundtrip = await thidRoundtripVerificationTest(); } catch (err) { results.thidRoundtrip = { pass: false, error: err.message }; }
  try { results.formatCompatibility = await thidFormatCompatibilityTest(); } catch (err) { results.formatCompatibility = { pass: false, error: err.message }; }
  try { results.pthidHandling = await pthidHandlingTest(); } catch (err) { results.pthidHandling = { pass: false, error: err.message }; }
  const allPassed = Object.values(results).every(r => r && r.pass);
  return { pass: allPassed, results };
}


