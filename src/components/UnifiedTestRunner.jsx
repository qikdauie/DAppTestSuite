import React, { useEffect, useMemo, useState } from 'react';
import { PreWithCopy } from '.';
import { getStatusColor } from '../utils';
import {
  coreDIDCommTests,
  permissionsAndSecurityTests,
  protocolTests,
  sdkComponentTests,
  convertedSuites,
  checkEnvironmentReadiness,
  ensureSDKReady,
  getEnvironmentInfo
} from '../tests/harness';
import {
  securityAttackTests,
  routerPipelineTests,
  odbSecurityTests,
  adversarialBreakTests,
} from '../tests/harness';
import { threadingTests } from '../tests/harness';

function useEnvStatus() {
  const [status, setStatus] = useState({ status: 'running' });
  useEffect(() => {
    (async () => {
      try { setStatus(await checkEnvironmentReadiness()); }
      catch (e) { setStatus({ pass: false, error: String(e) }); }
    })();
  }, []);
  return status;
}

function CategoryCard({ title, description, tests, ready, runAllLabel = 'Run Suite' }) {
  const [allRes, setAllRes] = useState(null);
  const [caseRes, setCaseRes] = useState({});

  function clearResults() {
    setAllRes(null);
    setCaseRes({});
  }

  async function runAll() {
    setAllRes({ status: 'running' });
    const entries = Object.entries(tests);
    const results = {};
    for (const [key, fn] of entries) {
      setCaseRes(prev => ({ ...prev, [key]: { status: 'running' } }));
      try {
        const res = await fn();
        results[key] = res;
        setCaseRes(prev => ({ ...prev, [key]: res }));
      } catch (err) {
        const res = { pass: false, error: String(err) };
        results[key] = res;
        setCaseRes(prev => ({ ...prev, [key]: res }));
      }
    }
    const pass = Object.values(results).every(r => r && r.pass === true);
    setAllRes({ pass, results });
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

  return (
    <div className="card" style={{ marginBottom: '2rem' }}>
      <h3 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {title}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={runAll}
            className="btn"
            disabled={!ready}
            style={{
              padding: '0.3rem 0.8rem',
              fontSize: '0.9rem',
              backgroundColor: (!ready ? '#ccc' : getStatusColor(allRes?.pass === true ? 'pass' : allRes?.pass === false ? 'fail' : allRes?.status === 'running' ? 'running' : 'primary').bg),
              color: (!ready ? '#666' : getStatusColor(allRes?.pass === true ? 'pass' : allRes?.pass === false ? 'fail' : allRes?.status === 'running' ? 'running' : 'primary').text),
              border: 'none',
              borderRadius: '4px'
            }}
          >{runAllLabel}</button>
          <button
            onClick={clearResults}
            className="btn"
            style={{
              padding: '0.3rem 0.8rem',
              fontSize: '0.9rem',
              backgroundColor: '#f0f0f0',
              color: '#333',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
          >Clear Results</button>
        </div>
      </h3>
      <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: '#666' }}>{description}</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
        {Object.entries(tests).map(([id, fn]) => (
          <button
            key={id}
            onClick={() => runOne(id, fn)}
            className="btn"
            disabled={!ready}
            style={{
              padding: '0.5rem',
              fontSize: '0.85rem',
              textAlign: 'left',
              backgroundColor: (!ready ? '#eee' : getStatusColor(
                caseRes[id]?.pass === true ? 'pass' :
                caseRes[id]?.pass === false ? 'fail' :
                caseRes[id]?.status === 'running' ? 'running' : 'idle')
              .bg),
              color: (!ready ? '#666' : getStatusColor(
                caseRes[id]?.pass === true ? 'pass' :
                caseRes[id]?.pass === false ? 'fail' :
                caseRes[id]?.status === 'running' ? 'running' : 'idle')
              .text),
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
          >{id}</button>
        ))}
      </div>

      {!ready && (
        <p style={{ margin: 0, fontSize: '0.85rem', color: '#a00' }}>
          Enablement pending: Service Worker/SDK not ready.
        </p>
      )}

      {allRes && (
        <details style={{ marginTop: '1rem' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>
            {title} - Full Suite Result: {allRes?.pass ? '✅ PASS' : allRes?.status === 'running' ? '⏳ RUNNING' : '❌ FAIL'}
          </summary>
          <PreWithCopy data={allRes} />
        </details>
      )}

      {Object.keys(caseRes).length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Individual Test Results:</h4>
          {Object.entries(caseRes).map(([id, res]) => (
            <details key={id} style={{ marginBottom: '0.5rem' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}>
                {id}: {res?.pass ? '✅ PASS' : res?.status === 'running' ? '⏳ RUNNING' : '❌ FAIL'}
              </summary>
              <PreWithCopy data={res} />
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

export default function UnifiedTestRunner() {
  const env = useEnvStatus();

  const categories = useMemo(() => ([
    {
      id: 'core',
      title: 'Core DIDComm Tests',
      description: 'Pack/Unpack, DID, and basic messaging flows',
      tests: coreDIDCommTests,
    },
    {
      id: 'permissions',
      title: 'Permissions & Security',
      description: 'Permission APIs and core security validations',
      tests: permissionsAndSecurityTests,
    },
    {
      id: 'protocols',
      title: 'Protocol Tests',
      description: 'Discover features, attachments, and edge cases',
      tests: protocolTests,
    },
    {
      id: 'sdk',
      title: 'SDK Component Tests',
      description: 'Client, service worker, protocols, and utils',
      tests: sdkComponentTests,
    },
    {
      id: 'converted',
      title: 'Converted Suites',
      description: 'Wrappers converted from vitest-style UI tests',
      tests: convertedSuites,
    },
    {
      id: 'threading',
      title: 'Threading (thid & reply_to)',
      description: 'Validate thid extraction and reply_to envelope threading',
      tests: threadingTests,
    },
    {
      id: 'security-attacks',
      title: 'Security Attacks',
      description: 'Basic attack vectors: plaintext, signed-only, tampering, replay, size, etc.',
      tests: securityAttackTests,
      runAllLabel: 'Run Suite',
    },
    {
      id: 'router-pipeline',
      title: 'Router Pipeline',
      description: 'Router validations: JOSE parsing, cipher policy, required fields, ordering, errors.',
      tests: routerPipelineTests,
      runAllLabel: 'Run Suite',
    },
    {
      id: 'odb-security',
      title: 'ODB Security',
      description: 'Out-of-band security validations: creation, ct-hash, nonce, time, origin, canonical bytes.',
      tests: odbSecurityTests,
      runAllLabel: 'Run Suite',
    },
    {
      id: 'adversarial-break',
      title: 'Adversarial Break',
      description: 'EXTREME tests: race conditions, memory exhaustion, nuclear JSON, header injection. Use caution.',
      tests: adversarialBreakTests,
      runAllLabel: 'Run Suite (Intensive)',
    },
  ]), []);

  return (
    <div>
      <h2>All UI-Triggered Tests</h2>
      <p className="muted">Unified runner for all browser-only DIDComm tests</p>

      {/* Environment status */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ margin: 0 }}>Environment</h3>
        <p style={{ margin: '0.3rem 0', fontSize: '0.9rem' }}>
          Status: {env?.pass === true ? '✅ READY' : env?.status === 'running' ? '⏳ CHECKING…' : '❌ NOT READY'}
        </p>
        <PreWithCopy data={env} />
      </div>

      {categories.map(cat => (
        <CategoryCard key={cat.id} title={cat.title} description={cat.description} tests={cat.tests} ready={env?.pass === true} runAllLabel={cat.runAllLabel} />
      ))}
    </div>
  );
}


