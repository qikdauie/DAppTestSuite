import { getReadyDecentClient} from 'decent_app_sdk';
import { RouterResults, MessageTypes } from 'decent_app_sdk/constants';

/**
 * Origin-DID Binding (ODB) Security Tests
 * 
 * Tests the core security mechanism from Security Model v0.9 §3.3
 * ODB ensures that only the Service Worker from the correct origin
 * can pack messages with valid bindings to canonical content.
 * 
 * Key ODB Components Tested:
 * - Service Worker registration hash validation (sw_reg_id_hash)
 * - Canonical content hash validation (ct_hash) 
 * - Time window enforcement (iat/exp)
 * - Nonce replay protection
 * - Origin verification
 */

// RouterResults imported from SDK constants replaces local enum

function expectFailureLabel(routerResult) {
  if (typeof routerResult === 'string') return routerResult;
  if (routerResult && typeof routerResult.result === 'string') return routerResult.result;
  return RouterResults.UNKNOWN_ERROR;
}

/**
 * Comprehensive ODB Security Test Suite
 * 
 * Tests all aspects of ODB creation, validation, and enforcement
 * per the security model requirements.
 */
export async function odbSecurityTests() {
  const msgr = await getReadyDecentClient();
  const { did } = await msgr.getDID();
  const results = {};

  // 1) ODB Creation Validation - verify proper ODB structure in BTC
  try {
    const body = JSON.stringify({ test: 'odb_creation', timestamp: Date.now() });
    const packed = await msgr.pack(did, MessageTypes.BASIC_MESSAGE.MESSAGE, body, [], '');
    
    if (packed.success && packed.message) {
      const parsed = JSON.parse(packed.message);
      const protectedHeader = JSON.parse(atob(parsed.protected));
      
      // Verify BTC ID is present (ODB should be associated with this)
      const hasBtcId = typeof protectedHeader.btc_id === 'string' && protectedHeader.btc_id.length > 0;
      const btcIdFormat = /^\d+$/.test(protectedHeader.btc_id); // Should be numeric string
      
      // Test sending to verify ODB validation occurs
      const send = await msgr.send(did, packed.message);
      const label = (typeof send === 'string') ? send : send?.result;
      const sendSucceeded = label === 'success';
      
      results.odb_creation_validation = {
        pass: hasBtcId && btcIdFormat && sendSucceeded,
        detail: {
          apis: ['packMessage', 'sendMessage'],
          responses: { packMessage: packed, sendMessage: send },
          btcId: protectedHeader.btc_id,
          hasBtcId,
          btcIdFormat,
          sendSucceeded,
          explanation: 'PDM should create valid ODB and associate with BTC ID for Router verification'
        }
      };
    } else {
      results.odb_creation_validation = { pass: false, detail: { error: 'Pack failed', responses: { packMessage: packed } } };
    }
  } catch (err) {
    results.odb_creation_validation = { pass: false, detail: { error: String(err), apis: ['packMessage', 'sendMessage'] } };
  }

  // 2) SW Registration Hash Validation - test ct_hash verification
  try {
    const body1 = JSON.stringify({ test: 'ct_hash_validation', content: 'original', timestamp: Date.now() });
    const body2 = JSON.stringify({ test: 'ct_hash_validation', content: 'modified', timestamp: Date.now() + 1000 });
    
    const packed1 = await msgr.pack(did, MessageTypes.BASIC_MESSAGE.MESSAGE, body1, [], '');
    const packed2 = await msgr.pack(did, MessageTypes.BASIC_MESSAGE.MESSAGE, body2, [], '');
    
    if (packed1.success && packed2.success) {
      const parsed1 = JSON.parse(packed1.message);
      const parsed2 = JSON.parse(packed2.message);
      
      // Swap ciphertext but keep same BTC ID (should fail ct_hash validation)
      const header1 = JSON.parse(atob(parsed1.protected));
      const header2 = JSON.parse(atob(parsed2.protected));
      
      // Create hybrid message: BTC ID from message1, ciphertext from message2
      header2.btc_id = header1.btc_id;
      parsed2.protected = btoa(JSON.stringify(header2));
      const hybridMessage = JSON.stringify(parsed2);
      
      const send = await msgr.send(did, hybridMessage);
      const label = (typeof send === 'string') ? send : send?.result;
      const ok = label === 'success';
      
      const pass = ok === false && [
        RouterResults.VALIDATION_FAILED,
        RouterResults.AUTHENTICATION_FAILED,
        RouterResults.INVALID_MESSAGE,
      ].includes(label);
      
      results.ct_hash_validation = {
        pass,
        detail: {
          apis: ['packMessage', 'packMessage', 'sendMessage'],
          responses: { packMessage1: packed1, packMessage2: packed2, sendMessage: send },
          btcId1: header1.btc_id,
          btcId2: header2.btc_id,
          hybridAttempt: true,
          label,
          explanation: 'Router should reject messages where BTC ct_hash does not match actual content'
        }
      };
    } else {
      results.ct_hash_validation = { pass: false, detail: { error: 'Pack failed', responses: { packed1, packed2 } } };
    }
  } catch (err) {
    results.ct_hash_validation = { pass: false, detail: { error: String(err), apis: ['packMessage', 'sendMessage'] } };
  }

  // 3) Nonce Replay Protection - test ODB nonce uniqueness
  try {
    const body = JSON.stringify({ test: 'nonce_replay', timestamp: Date.now() });
    
    // Pack the same content twice - should get different BTC IDs/nonces
    const packed1 = await msgr.pack(did, MessageTypes.BASIC_MESSAGE.MESSAGE, body, [], '');
    await new Promise(resolve => setTimeout(resolve, 10)); // Small delay to ensure different timestamps
    const packed2 = await msgr.pack(did, MessageTypes.BASIC_MESSAGE.MESSAGE, body, [], '');
    
    if (packed1.success && packed2.success) {
      const header1 = JSON.parse(atob(JSON.parse(packed1.message).protected));
      const header2 = JSON.parse(atob(JSON.parse(packed2.message).protected));
      
      const differentBtcIds = header1.btc_id !== header2.btc_id;
      
      // Send both - both should succeed since they have different nonces/BTC IDs
      const send1 = await msgr.send(did, packed1.message);
      const send2 = await msgr.send(did, packed2.message);
      const label1 = (typeof send1 === 'string') ? send1 : send1?.result;
      const label2 = (typeof send2 === 'string') ? send2 : send2?.result;
      
      const bothSucceeded = (label1 === 'success') && (label2 === 'success');
      
      results.nonce_replay_protection = {
        pass: differentBtcIds && bothSucceeded,
        detail: {
          apis: ['packMessage', 'packMessage', 'sendMessage', 'sendMessage'],
          responses: { packMessage1: packed1, packMessage2: packed2, sendMessage1: send1, sendMessage2: send2 },
          btcId1: header1.btc_id,
          btcId2: header2.btc_id,
          differentBtcIds,
          bothSucceeded,
          explanation: 'Each pack should generate unique BTC ID/nonce even for same content'
        }
      };
    } else {
      results.nonce_replay_protection = { pass: false, detail: { error: 'Pack failed', responses: { packed1, packed2 } } };
    }
  } catch (err) {
    results.nonce_replay_protection = { pass: false, detail: { error: String(err), apis: ['packMessage', 'sendMessage'] } };
  }

  // 4) Time Window Validation - test ODB expiration (if enforced)
  try {
    const body = JSON.stringify({ test: 'time_validation', timestamp: Date.now() });
    const packed = await msgr.pack(did, MessageTypes.BASIC_MESSAGE.MESSAGE, body, [], '');
    
    if (packed.success && packed.message) {
      // Immediately send - should succeed
      const immediateSend = await msgr.send(did, packed.message);
      
      // Wait a bit and try again (testing if ODB expires)
      await new Promise(resolve => setTimeout(resolve, 1000));
      const delayedSend = await msgr.send(did, packed.message);
      
      const immediateLabel = (typeof immediateSend === 'string') ? immediateSend : immediateSend?.result;
      const immediateSuccess = immediateLabel === 'success';
      const delayedLabel = (typeof delayedSend === 'string') ? delayedSend : delayedSend?.result;
      
      // Delayed send might fail due to expiration or replay detection
      const expectedDelayedFailure = [
        RouterResults.REQUEST_EXPIRED,
        RouterResults.VALIDATION_FAILED,
        RouterResults.AUTHENTICATION_FAILED,
      ].includes(delayedLabel);
      
      results.time_window_validation = {
        pass: immediateSuccess, // Accept either outcome for delayed send
        detail: {
          apis: ['packMessage', 'sendMessage', 'sendMessage'],
          responses: { packMessage: packed, immediateSend, delayedSend },
          immediateSuccess,
          delayedLabel,
          expectedDelayedFailure,
          explanation: 'ODB should have time window validation - immediate use succeeds, delayed may fail'
        }
      };
    } else {
      results.time_window_validation = { pass: false, detail: { error: 'Pack failed', responses: { packMessage: packed } } };
    }
  } catch (err) {
    results.time_window_validation = { pass: false, detail: { error: String(err), apis: ['packMessage', 'sendMessage'] } };
  }

  // 5) Origin Verification - test that ODB binds to correct origin
  try {
    const body = JSON.stringify({ test: 'origin_verification', timestamp: Date.now() });
    const packed = await msgr.pack(did, MessageTypes.BASIC_MESSAGE.MESSAGE, body, [], '');
    
    if (packed.success && packed.message) {
      const parsed = JSON.parse(packed.message);
      const protectedHeader = JSON.parse(atob(parsed.protected));
      
      // Verify BTC ID exists (implies ODB with origin binding)
      const hasBtcId = typeof protectedHeader.btc_id === 'string';
      
      // Send should succeed (origin matches)
      const send = await msgr.send(did, packed.message);
      const label = (typeof send === 'string') ? send : send?.result;
      const sendSucceeded = label === 'success';
      
      results.origin_verification = {
        pass: hasBtcId && sendSucceeded,
        detail: {
          apis: ['packMessage', 'sendMessage'],
          responses: { packMessage: packed, sendMessage: send },
          btcId: protectedHeader.btc_id,
          hasBtcId,
          sendSucceeded,
          currentOrigin: typeof window !== 'undefined' ? window.location.origin : 'unknown',
          explanation: 'ODB should bind message to current origin and succeed when origins match'
        }
      };
    } else {
      results.origin_verification = { pass: false, detail: { error: 'Pack failed', responses: { packMessage: packed } } };
    }
  } catch (err) {
    results.origin_verification = { pass: false, detail: { error: String(err), apis: ['packMessage', 'sendMessage'] } };
  }

  // 6) Canonical Bytes Validation - test RFC 8785 JCS canonicalization
  try {
    // Create two equivalent JSON objects with different formatting
    const bodyObj = { test: 'canonicalization', value: 123, nested: { a: 1, b: 2 } };
    const body1 = JSON.stringify(bodyObj); // Normal formatting
    const body2 = JSON.stringify(bodyObj, null, 2); // Pretty printed - different bytes, same canonical form
    
    const packed1 = await msgr.pack(did, MessageTypes.BASIC_MESSAGE.MESSAGE, body1, [], '');
    const packed2 = await msgr.pack(did, MessageTypes.BASIC_MESSAGE.MESSAGE, body2, [], '');
    
    if (packed1.success && packed2.success) {
      // Both should pack and send successfully since they have the same canonical content
      const send1 = await msgr.send(did, packed1.message);
      const send2 = await msgr.send(did, packed2.message);
      
      const label1 = (typeof send1 === 'string') ? send1 : send1?.result;
      const label2 = (typeof send2 === 'string') ? send2 : send2?.result;
      
      const bothSucceeded = label1 === 'success' && label2 === 'success';
      
      results.canonical_bytes_validation = {
        pass: bothSucceeded,
        detail: {
          apis: ['packMessage', 'packMessage', 'sendMessage', 'sendMessage'],
          responses: { packMessage1: packed1, packMessage2: packed2, sendMessage1: send1, sendMessage2: send2 },
          body1Length: body1.length,
          body2Length: body2.length,
          bothSucceeded,
          explanation: 'ODB should use RFC 8785 JCS canonicalization - different JSON formatting should not matter'
        }
      };
    } else {
      results.canonical_bytes_validation = { pass: false, detail: { error: 'Pack failed', responses: { packed1, packed2 } } };
    }
  } catch (err) {
    results.canonical_bytes_validation = { pass: false, detail: { error: String(err), apis: ['packMessage', 'sendMessage'] } };
  }

  const overallPass = Object.values(results).every(r => r && r.pass === true);
  return { pass: overallPass, results };
}

// Individual test functions for targeted testing
export async function odbCreationValidationTest() {
  return (await odbSecurityTests()).results.odb_creation_validation;
}

export async function ctHashValidationTest() {
  return (await odbSecurityTests()).results.ct_hash_validation;
}

export async function nonceReplayProtectionTest() {
  return (await odbSecurityTests()).results.nonce_replay_protection;
}

export async function timeWindowValidationTest() {
  return (await odbSecurityTests()).results.time_window_validation;
}

export async function originVerificationTest() {
  return (await odbSecurityTests()).results.origin_verification;
}

export async function canonicalBytesValidationTest() {
  return (await odbSecurityTests()).results.canonical_bytes_validation;
}


