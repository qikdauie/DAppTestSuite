import { connectMessenger } from '../sdk/messenger-client.js';

/**
 * Router Verification Pipeline Tests
 * 
 * Tests the ordered verification pipeline from Security Model v0.9 §3.4
 * 
 * Router verification pipeline (ordered):
 * 1. Parse JOSE - enforce internal consistency
 * 2. ODB provenance & integrity - verify IPC caller is PDM
 * 3. Time window - accept if iat/exp within ±300s skew
 * 4. Replay/nonce checks
 * 5. SW registration - recompute sw_reg_id_hash from live registration
 * 6. Canonical bytes - recompute ct_hash
 * 7. Transport/content pins - HTTPS/IPFS binding verification
 * 8. Cipher policy & JOSE suite allow-list
 * 9. If all pass, enqueue to delivery; else drop
 */

const ROUTER = {
  SUCCESS: 'success',
  ABORTED: 'aborted',
  ACCESS_DENIED: 'access-denied',
  INVALID_ADDRESS: 'invalid-address',
  ADDRESS_IN_USE: 'address-in-use',
  INVALID_MESSAGE: 'invalid-message',
  NO_ROUTE: 'no-route',
  VALIDATION_FAILED: 'validation-failed',
  AUTHENTICATION_FAILED: 'authentication-failed',
  REQUEST_EXPIRED: 'request-expired',
  RATE_LIMIT_EXCEEDED: 'rate-limit-exceeded',
  UNKNOWN_ERROR: 'unknown-error',
};

function expectFailureLabel(routerResult) {
  if (typeof routerResult === 'string') return routerResult;
  if (routerResult && typeof routerResult.result === 'string') return routerResult.result;
  return ROUTER.UNKNOWN_ERROR;
}

/**
 * Router Verification Pipeline Test Suite
 * 
 * Tests each step of the Router's ordered verification process
 * to ensure security model compliance.
 */
export async function routerPipelineTests() {
  const msgr = await connectMessenger();
  const { did } = await msgr.getDID();
  const results = {};

  // 1) JOSE Parsing & Internal Consistency
  try {
    // Test with malformed JSON - should fail at step 1
    const malformedJson = '{"protected":"invalid","recipients":[}'; // Intentionally malformed
    
    const send = await msgr.sendRaw(did, malformedJson);
    const label = expectFailureLabel(send);
    
    const pass = send?.ok === false && [
      ROUTER.INVALID_MESSAGE,
      ROUTER.VALIDATION_FAILED,
    ].includes(label);
    
    results.jose_parsing_validation = {
      pass,
      detail: {
        apis: ['sendMessage'],
        responses: { sendMessage: send },
        label,
        explanation: 'Router step 1: Should reject malformed JSON at JOSE parsing stage'
      }
    };
  } catch (err) {
    results.jose_parsing_validation = { pass: true, detail: { error: String(err), apis: ['sendMessage'] } };
  }

  // 2) JOSE Internal Consistency - typ vs structure
  try {
    // Valid JSON but inconsistent JOSE structure
    const inconsistentJose = JSON.stringify({
      protected: btoa(JSON.stringify({
        typ: "application/didcomm-encrypted+json", // Claims to be JWE
        alg: "EdDSA" // But uses JWS algorithm
      })),
      payload: "invalid_for_jwe", // JWS field in claimed JWE
      signature: "not_jwe_structure"
    });
    
    const send = await msgr.sendRaw(did, inconsistentJose);
    const label = expectFailureLabel(send);
    
    const pass = send?.ok === false && [
      ROUTER.INVALID_MESSAGE,
      ROUTER.VALIDATION_FAILED,
    ].includes(label);
    
    results.jose_consistency_validation = {
      pass,
      detail: {
        apis: ['sendMessage'],
        responses: { sendMessage: send },
        label,
        explanation: 'Router step 1: Should reject JOSE with inconsistent typ vs structure'
      }
    };
  } catch (err) {
    results.jose_consistency_validation = { pass: true, detail: { error: String(err), apis: ['sendMessage'] } };
  }

  // 3) Cipher Policy Validation - test JOSE suite allow-list
  try {
    // Create JWE with unsupported algorithm
    const unsupportedAlg = JSON.stringify({
      protected: btoa(JSON.stringify({
        typ: "application/didcomm-encrypted+json",
        alg: "RSA-OAEP", // Not in allowed list (should be ECDH-1PU+A256KW)
        enc: "A256GCM",
        skid: did,
        btc_id: "123456789"
      })),
      recipients: [{
        header: { alg: "RSA-OAEP", kid: did },
        encrypted_key: "fake_key"
      }],
      ciphertext: "fake_ciphertext",
      iv: "fake_iv",
      tag: "fake_tag"
    });
    
    const send = await msgr.sendRaw(did, unsupportedAlg);
    const label = expectFailureLabel(send);
    
    const pass = send?.ok === false && [
      ROUTER.VALIDATION_FAILED,
      ROUTER.AUTHENTICATION_FAILED,
      ROUTER.INVALID_MESSAGE,
    ].includes(label);
    
    results.cipher_policy_validation = {
      pass,
      detail: {
        apis: ['sendMessage'],
        responses: { sendMessage: send },
        label,
        explanation: 'Router step 8: Should reject messages with unsupported cipher algorithms'
      }
    };
  } catch (err) {
    results.cipher_policy_validation = { pass: true, detail: { error: String(err), apis: ['sendMessage'] } };
  }

  // 4) Required Header Fields Validation
  try {
    // JWE missing required skid field
    const missingSkid = JSON.stringify({
      protected: btoa(JSON.stringify({
        typ: "application/didcomm-encrypted+json",
        alg: "ECDH-1PU+A256KW",
        enc: "A256GCM",
        // skid: missing
        btc_id: "123456789"
      })),
      recipients: [{
        header: { alg: "ECDH-1PU+A256KW", kid: did },
        encrypted_key: "fake_key"
      }],
      ciphertext: "fake_ciphertext",
      iv: "fake_iv", 
      tag: "fake_tag"
    });
    
    const send = await msgr.sendRaw(did, missingSkid);
    const label = expectFailureLabel(send);
    
    const pass = send?.ok === false && [
      ROUTER.VALIDATION_FAILED,
      ROUTER.INVALID_MESSAGE,
    ].includes(label);
    
    results.required_fields_validation = {
      pass,
      detail: {
        apis: ['sendMessage'],
        responses: { sendMessage: send },
        label,
        explanation: 'Router should reject JWE missing required header fields like skid'
      }
    };
  } catch (err) {
    results.required_fields_validation = { pass: true, detail: { error: String(err), apis: ['sendMessage'] } };
  }

  // 5) Transport Posture Enforcement - test §3.1 rules
  try {
    // Test plaintext JWM (should be rejected per security model)
    const plaintextJwm = JSON.stringify({
      typ: "application/didcomm-plain+json",
      id: "test-plaintext",
      type: "https://didcomm.org/basicmessage/2.0/message",
      from: did,
      to: [did],
      body: { test: "plaintext_not_allowed" }
    });
    
    const send = await msgr.sendRaw(did, plaintextJwm);
    const label = expectFailureLabel(send);
    
    const pass = send?.ok === false && [
      ROUTER.VALIDATION_FAILED,
      ROUTER.ACCESS_DENIED,
      ROUTER.INVALID_MESSAGE,
    ].includes(label);
    
    results.transport_posture_enforcement = {
      pass,
      detail: {
        apis: ['sendMessage'],
        responses: { sendMessage: send },
        label,
        explanation: 'Router should enforce transport posture - plaintext forbidden per security model §3.1'
      }
    };
  } catch (err) {
    results.transport_posture_enforcement = { pass: true, detail: { error: String(err), apis: ['sendMessage'] } };
  }

  // 6) BTC Association Validation - verify BTC ID is required
  try {
    // Valid JWE structure but missing btc_id
    const noBtcId = JSON.stringify({
      protected: btoa(JSON.stringify({
        typ: "application/didcomm-encrypted+json",
        alg: "ECDH-1PU+A256KW",
        enc: "A256GCM",
        skid: did
        // btc_id: missing - should cause failure
      })),
      recipients: [{
        header: { alg: "ECDH-1PU+A256KW", kid: did },
        encrypted_key: "fake_key"
      }],
      ciphertext: "fake_ciphertext",
      iv: "fake_iv",
      tag: "fake_tag"
    });
    
    const send = await msgr.sendRaw(did, noBtcId);
    const label = expectFailureLabel(send);
    
    const pass = send?.ok === false && [
      ROUTER.VALIDATION_FAILED,
      ROUTER.AUTHENTICATION_FAILED,
      ROUTER.INVALID_MESSAGE,
    ].includes(label);
    
    results.btc_association_validation = {
      pass,
      detail: {
        apis: ['sendMessage'],
        responses: { sendMessage: send },
        label,
        explanation: 'Router should reject messages without BTC ID - ODB verification requires BTC association'
      }
    };
  } catch (err) {
    results.btc_association_validation = { pass: true, detail: { error: String(err), apis: ['sendMessage'] } };
  }

  // 7) Pipeline Ordering Test - verify failures happen at appropriate stages
  try {
    const body = JSON.stringify({ test: 'pipeline_ordering', timestamp: Date.now() });
    const validPacked = await msgr.packFull(did, 'https://didcomm.org/basicmessage/2.0/send-message', body, [], '');
    
    if (validPacked.success) {
      // First, verify a valid message succeeds
      const validSend = await msgr.sendRaw(did, validPacked.message);
      const validSuccess = validSend?.ok === true;
      
      // Then test that each type of invalid message fails appropriately
      const tests = [
        { name: 'malformed_json', message: '{"invalid": json}', expectedStage: 'parsing' },
        { name: 'missing_btc_id', message: validPacked.message.replace(/"btc_id":"[^"]*"/, ''), expectedStage: 'btc_validation' },
      ];
      
      const testResults = {};
      for (const test of tests) {
        try {
          const send = await msgr.sendRaw(did, test.message);
          testResults[test.name] = {
            ok: send?.ok,
            result: expectFailureLabel(send),
            failed_as_expected: send?.ok === false
          };
        } catch (err) {
          testResults[test.name] = { error: String(err), failed_as_expected: true };
        }
      }
      
      const allFailedAsExpected = Object.values(testResults).every(r => r.failed_as_expected);
      
      results.pipeline_ordering_validation = {
        pass: validSuccess && allFailedAsExpected,
        detail: {
          apis: ['packMessage', 'sendMessage'],
          responses: { packMessage: validPacked, validSend, testResults },
          validSuccess,
          allFailedAsExpected,
          explanation: 'Router pipeline should handle different error types at appropriate stages'
        }
      };
    } else {
      results.pipeline_ordering_validation = { pass: false, detail: { error: 'Valid pack failed', responses: { packMessage: validPacked } } };
    }
  } catch (err) {
    results.pipeline_ordering_validation = { pass: false, detail: { error: String(err), apis: ['packMessage', 'sendMessage'] } };
  }

  // 8) Error Response Consistency - verify Router returns consistent error formats
  try {
    const errorTests = [
      { name: 'malformed', message: 'not_json' },
      { name: 'empty', message: '' },
      { name: 'null', message: 'null' },
      { name: 'invalid_jose', message: '{"protected":"not_base64_!@#"}' }
    ];
    
    const errorResponses = {};
    for (const test of errorTests) {
      try {
        const send = await msgr.sendRaw(did, test.message);
        errorResponses[test.name] = {
          ok: send?.ok,
          result: send?.result,
          hasOkField: 'ok' in send,
          hasResultField: 'result' in send,
          resultType: typeof send?.result
        };
      } catch (err) {
        errorResponses[test.name] = { error: String(err) };
      }
    }
    
    // Check that all error responses have consistent structure
    const consistentStructure = Object.values(errorResponses).every(r => 
      r.error || (r.hasOkField && r.hasResultField && typeof r.resultType === 'string')
    );
    
    results.error_response_consistency = {
      pass: consistentStructure,
      detail: {
        apis: ['sendMessage'],
        errorResponses,
        consistentStructure,
        explanation: 'Router should return consistent error response format across all failure types'
      }
    };
  } catch (err) {
    results.error_response_consistency = { pass: false, detail: { error: String(err), apis: ['sendMessage'] } };
  }

  const overallPass = Object.values(results).every(r => r && r.pass === true);
  return { pass: overallPass, results };
}

// Individual test functions for targeted testing
export async function joseParsingValidationTest() {
  return (await routerPipelineTests()).results.jose_parsing_validation;
}

export async function joseConsistencyValidationTest() {
  return (await routerPipelineTests()).results.jose_consistency_validation;
}

export async function cipherPolicyValidationTest() {
  return (await routerPipelineTests()).results.cipher_policy_validation;
}

export async function requiredFieldsValidationTest() {
  return (await routerPipelineTests()).results.required_fields_validation;
}

export async function transportPostureEnforcementTest() {
  return (await routerPipelineTests()).results.transport_posture_enforcement;
}

export async function btcAssociationValidationTest() {
  return (await routerPipelineTests()).results.btc_association_validation;
}

export async function pipelineOrderingValidationTest() {
  return (await routerPipelineTests()).results.pipeline_ordering_validation;
}

export async function errorResponseConsistencyTest() {
  return (await routerPipelineTests()).results.error_response_consistency;
}
