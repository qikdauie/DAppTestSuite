import React, { useState, useEffect } from 'react';
import { getReadyDecentClient} from 'decent_app_sdk';
import {
  securityAttackTests,
  attackPlaintextUnicast,
  attackSignedOnlyUnicast,
  attackPlaintextJwm,
  attackOversize,
  attackTamper,
  attackReplay,
  attackBackpressure,
  // New comprehensive security tests
  attackBtcIdTampering,
  attackBtcIdReuse,
  attackProtectedHeaderValidation,
  attackJweStructureValidation,
  attackErrorCodeSpecificity
} from './tests/securityAttacks';
import {
  odbSecurityTests,
  odbCreationValidationTest,
  ctHashValidationTest,
  nonceReplayProtectionTest,
  timeWindowValidationTest,
  originVerificationTest,
  canonicalBytesValidationTest
} from './tests/odbSecurityTests';
import {
  routerPipelineTests,
  joseParsingValidationTest,
  joseConsistencyValidationTest,
  cipherPolicyValidationTest,
  requiredFieldsValidationTest,
  transportPostureEnforcementTest,
  btcAssociationValidationTest,
  pipelineOrderingValidationTest,
  errorResponseConsistencyTest
} from './tests/routerPipelineTests';
import {
  adversarialBreakTests,
  btcIdOverflowApocalypseTest,
  extremeRaceConditionTest,
  unicodeApocalypseTest,
  jsonNuclearBombTest,
  precisionTimingAttackTest,
  extremeMemoryExhaustionTest,
  advancedCrossOriginPollutionTest,
  ultimateHeaderInjectionTest
} from './tests/adversarialBreakTests';

function Pre({ data }) {
  const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  return (
    <pre style={{ background: '#f7f7f7', padding: '0.5rem', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{text}</pre>
  );
}

export default function SecurityLab() {
  const [allRes, setAllRes] = useState({});
  const [caseRes, setCaseRes] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const sdk = await getReadyDecentClient();
        try { await sdk.protocols.refresh(); } catch {}
      } catch {}
    })();
  }, []);

  async function runAllCategory(category, testFn) {
    setAllRes(prev => ({ ...prev, [category]: { status: 'running' } }));
    try {
      const res = await testFn();
      setAllRes(prev => ({ ...prev, [category]: res }));
    } catch (err) {
      setAllRes(prev => ({ ...prev, [category]: { pass: false, error: String(err) } }));
    }
  }

  async function runOne(id, fn) {
    setCaseRes(prev => ({ ...prev, [id]: { status: 'running' } }));
    try {
      const res = await fn();
      setCaseRes(prev => ({ ...prev, [id]: res }));
    } catch (err) {
      setCaseRes(prev => ({ ...prev, [id]: { pass: false, error: String(err) } }));
    }
  }

  const testCategories = {
    securityAttacks: {
      title: '🔒 Security Attack Tests',
      description: 'Core security model enforcement tests from securityAttacks.js',
      runAll: () => runAllCategory('securityAttacks', securityAttackTests),
      tests: [
        { id: 'plaintext', label: 'Plaintext unicast forbidden', fn: attackPlaintextUnicast },
        { id: 'signedOnly', label: 'Signed-only unicast rejected', fn: attackSignedOnlyUnicast },
        { id: 'plainJwm', label: 'Plaintext JWM rejected', fn: attackPlaintextJwm },
        { id: 'oversize', label: 'Oversize message rejected (SKIPPED)', fn: attackOversize },
        { id: 'tamper', label: 'Tamper detection (ct_hash mismatch)', fn: attackTamper },
        { id: 'replay', label: 'Replay prevention (nonce/CID)', fn: attackReplay },
        { id: 'backpressure', label: 'Backpressure (burst sends)', fn: attackBackpressure },
        { id: 'btcTamper', label: 'BTC ID tampering detection', fn: attackBtcIdTampering },
        { id: 'btcReuse', label: 'BTC ID reuse prevention', fn: attackBtcIdReuse },
        { id: 'headerValid', label: 'Protected header validation', fn: attackProtectedHeaderValidation },
        { id: 'jweValid', label: 'JWE structure validation', fn: attackJweStructureValidation },
        { id: 'errorSpec', label: 'Error code specificity', fn: attackErrorCodeSpecificity },
      ]
    },
    odbSecurity: {
      title: '🔐 Origin-DID Binding (ODB) Tests',
      description: 'Tests ODB creation, validation, and security per Security Model §3.3',
      runAll: () => runAllCategory('odbSecurity', odbSecurityTests),
      tests: [
        { id: 'odbCreation', label: 'ODB Creation & Validation', fn: odbCreationValidationTest },
        { id: 'ctHash', label: 'Canonical Content Hash (ct_hash)', fn: ctHashValidationTest },
        { id: 'nonceReplay', label: 'Nonce Replay Protection', fn: nonceReplayProtectionTest },
        { id: 'timeWindow', label: 'Time Window Validation', fn: timeWindowValidationTest },
        { id: 'originVerify', label: 'Origin Verification', fn: originVerificationTest },
        { id: 'canonical', label: 'RFC 8785 JCS Canonicalization', fn: canonicalBytesValidationTest },
      ]
    },
    routerPipeline: {
      title: '⚙️ Router Verification Pipeline Tests',
      description: 'Tests ordered verification pipeline per Security Model §3.4',
      runAll: () => runAllCategory('routerPipeline', routerPipelineTests),
      tests: [
        { id: 'joseParse', label: 'JOSE Parsing & Validation', fn: joseParsingValidationTest },
        { id: 'joseConsist', label: 'JOSE Internal Consistency', fn: joseConsistencyValidationTest },
        { id: 'cipherPolicy', label: 'Cipher Policy Enforcement', fn: cipherPolicyValidationTest },
        { id: 'requiredFields', label: 'Required Header Fields', fn: requiredFieldsValidationTest },
        { id: 'transportPosture', label: 'Transport Posture Enforcement', fn: transportPostureEnforcementTest },
        { id: 'btcAssoc', label: 'BTC Association Validation', fn: btcAssociationValidationTest },
        { id: 'pipelineOrder', label: 'Pipeline Ordering Validation', fn: pipelineOrderingValidationTest },
        { id: 'errorConsist', label: 'Error Response Consistency', fn: errorResponseConsistencyTest },
      ]
    },
    adversarialBreak: {
      title: '💀 ADVERSARIAL BREAK TESTS 💀',
      description: '🔥 EXTREME HARDCORE attacks designed to ANNIHILATE the security model - 100x concurrent hammering, gigabyte payloads, nuclear JSON bombs, precision timing attacks! ⚠️ MAY CRASH BROWSER ⚠️',
      runAll: () => runAllCategory('adversarialBreak', adversarialBreakTests),
      tests: [
        { id: 'btcApocalypse', label: '💥 BTC ID OVERFLOW APOCALYPSE', fn: btcIdOverflowApocalypseTest },
        { id: 'extremeRace', label: '⚡ EXTREME RACE CONDITION (100x)', fn: extremeRaceConditionTest },
        { id: 'unicodeApocalypse', label: '🔤 UNICODE APOCALYPSE', fn: unicodeApocalypseTest },
        { id: 'nuclearBomb', label: '💣 JSON NUCLEAR BOMBS (100MB+)', fn: jsonNuclearBombTest },
        { id: 'precisionTiming', label: '⏱️ PRECISION TIMING ATTACK', fn: precisionTimingAttackTest },
        { id: 'extremeMemory', label: '🧠 EXTREME MEMORY EXHAUSTION (GB)', fn: extremeMemoryExhaustionTest },
        { id: 'advancedPollution', label: '🌐 ADVANCED CROSS-ORIGIN POLLUTION', fn: advancedCrossOriginPollutionTest },
        { id: 'ultimateInjection', label: '💉 ULTIMATE HEADER INJECTION', fn: ultimateHeaderInjectionTest },
      ]
    }
  };

  return (
    <div>
      <h2>Security Lab</h2>
      <p>Comprehensive security tests for the Origin-Bound DIDComm Security Model v0.9</p>
      
      {Object.entries(testCategories).map(([categoryId, category]) => (
        <div key={categoryId} style={{ 
          border: '1px solid #ddd', 
          borderRadius: '8px', 
          marginBottom: '2rem', 
          padding: '1rem',
          backgroundColor: '#fafafa'
        }}>
          <h3 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {category.title}
            <button 
              onClick={category.runAll}
              style={{ 
                padding: '0.3rem 0.8rem', 
                fontSize: '0.9rem',
                backgroundColor: allRes[categoryId]?.pass === true ? '#d4edda' : 
                               allRes[categoryId]?.pass === false ? '#f8d7da' :
                               allRes[categoryId]?.status === 'running' ? '#fff3cd' : '#007bff',
                color: allRes[categoryId] ? '#333' : 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Run All
            </button>
          </h3>
          <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: '#666' }}>
            {category.description}
          </p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
            {category.tests.map(test => (
              <button 
                key={test.id}
                onClick={() => runOne(test.id, test.fn)}
                style={{ 
                  padding: '0.5rem', 
                  fontSize: '0.85rem',
                  textAlign: 'left',
                  backgroundColor: caseRes[test.id]?.pass === true ? '#d4edda' : 
                                 caseRes[test.id]?.pass === false ? '#f8d7da' :
                                 caseRes[test.id]?.status === 'running' ? '#fff3cd' : '#e9ecef',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {test.label}
              </button>
            ))}
          </div>

          {/* Category Results */}
          {allRes[categoryId] && (
            <details style={{ marginTop: '1rem' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>
                {category.title} - Full Suite Result: {allRes[categoryId]?.pass ? '✅ PASS' : '❌ FAIL'}
              </summary>
              <Pre data={allRes[categoryId]} />
            </details>
          )}

          {/* Individual Test Results */}
          {category.tests.some(t => caseRes[t.id]) && (
            <div style={{ marginTop: '1rem' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Individual Test Results:</h4>
              {category.tests.map(test => (
                caseRes[test.id] ? (
                  <details key={test.id} style={{ marginBottom: '0.5rem' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}>
                      {test.label}: {caseRes[test.id]?.pass ? '✅ PASS' : '❌ FAIL'}
                    </summary>
                    <Pre data={caseRes[test.id]} />
                  </details>
                ) : null
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}


