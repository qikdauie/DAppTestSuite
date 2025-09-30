import React, { useState, useEffect } from 'react';
import { getReadyDecentClient, extractThid } from 'decent_app_sdk';

export default function Messenger() {
  const [msgr, setMsgr]   = useState(null);
  const [myDid, setMyDid] = useState('');
  const [dest, setDest]   = useState('');
  const [text, setText]   = useState('');
  const [messages, setMessages] = useState([]);  // {id, dir, text, peer, ts, raw, thid, replyingTo}[]
  const [replyingTo, setReplyingTo] = useState(null);  // Message being replied to

  // boot once
  useEffect(() => {
    let unsubscribe;
    let cancelled = false;

    (async () => {
      const app = await getReadyDecentClient();
      setMsgr(app);

      const { did } = await app.getDID();
      setMyDid(did);

      try {
        await app.protocols.refresh();
      } catch (e) {
        console.warn('protocols.refresh failed', e);
      }

      if (cancelled) return;

      unsubscribe = app.onMessage(async raw => {
        console.log('[UI][Messenger] received incoming message from SW');
        console.log('raw', raw);
        let body = null;
        try {
          if (typeof raw === 'string') {
            console.log('[UI][Messenger] payload is string; unpacking');
            const up = await app.unpack(raw);
            if (!up.success) { console.warn('[UI][Messenger] unpack failed'); return; }
            body = JSON.parse(up.message);
            console.log(`[UI][Messenger] unpacked message successfully, from: ${body.from}`);
          } else if (raw && typeof raw === 'object') {
            console.log('[UI][Messenger] payload already unpacked; using directly');
            body = raw;
          } else {
            console.warn('[UI][Messenger] unknown payload format; ignoring');
            return;
          }
        } catch (e) {
          console.warn('[UI][Messenger] failed to process incoming payload', e);
          return;
        }
        const thid = extractThid(body);
        const msgId = `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        setMessages(msgs => {
          const next = [...msgs, {
          id: msgId,
          dir: 'in',
          text: body.body?.text || '[no text]',
          peer: body.from,
          ts: Date.now(),
          raw: body,
          thid: thid || undefined,
          replyingTo: undefined
          }];
          console.log(`[UI][Messenger] message added to state, total: ${next.length}`);
          return next;
        });
      });
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  // removed push helper; inline setMessages instead

  // send button
  async function send() {
    if (!msgr || !dest || !text) return;

    try {
      const body   = { text };
      const replyToRaw = replyingTo ? JSON.stringify(replyingTo.raw) : "";
      const packed = await msgr.pack(
        dest,
        'https://didcomm.org/basicmessage/2.0/message',
        JSON.stringify(body),
        [],
        replyToRaw);

      if (!packed?.success) {
        console.error('pack failed', packed);
        return;
      }

      const ok = await msgr.sendOk(dest, packed.message);
      if (ok) {
        console.log('sent', dest, packed.message);
        const msgId = `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        setMessages(msgs => [...msgs, {
          id: msgId,
          dir: 'out',
          text: text,
          peer: dest,
          ts: Date.now(),
          thid: packed.thid || undefined,
          replyingTo: replyingTo?.id || undefined
        }]);
        setReplyingTo(null);
      }
    } catch (err) {
      console.error('send error', err);
    }

    setText('');
  }

  // ─ UI ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '1rem' }}>
      <h2>DIDComm Messenger</h2>

      <div style={{ marginBottom: '0.75rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8 }}>
        <strong>Your DID:</strong>
        <span style={{ wordBreak: 'break-all', fontFamily: 'monospace', flex: 1 }}>
          {myDid || '…'}
        </span>
        <button className="btn btn-secondary" onClick={async () => {
          try { await navigator.clipboard.writeText(myDid || ''); } catch {}
        }}>Copy DID</button>
      </div>

      <div style={{ marginBottom: 8 }}>
        <input
          style={{ width: '60%', marginRight: 6 }}
          placeholder="Destination DID"
          value={dest}
          onChange={e => setDest(e.target.value)}
        />
        <button className="btn btn-outline" onClick={() => setDest('')}>Clear</button>
      </div>

      {replyingTo && (
        <div style={{ marginBottom: 8, padding: 8, backgroundColor: 'var(--color-bg-secondary)', borderRadius: 4 }}>
          <div style={{ fontSize: '0.85rem', marginBottom: 4 }}>
            <strong>Replying to:</strong> {replyingTo.text.substring(0, 50)}{replyingTo.text.length > 50 ? '...' : ''}
          </div>
          <button className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '4px 8px' }} onClick={() => setReplyingTo(null)}>Cancel Reply</button>
        </div>
      )}

      <div style={{ display: 'flex', marginBottom: 8, gap: 6 }}>
        <input
          style={{ flex: 1, marginRight: 6 }}
          placeholder="Message"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
        />
        <button className="btn btn-primary" onClick={send}>Send</button>
        <button className="btn btn-outline" onClick={() => { setMessages([]); setReplyingTo(null); }}>Clear Log</button>
      </div>

      <div className="card" style={{ maxHeight: 260, overflowY: 'auto' }}>
        {messages.map((m, i) => (
          <div key={m.id} style={{ 
            textAlign: m.dir === 'out' ? 'right' : 'left', 
            margin: '4px 0',
            paddingLeft: m.replyingTo ? '20px' : '0',
            borderLeft: m.replyingTo ? '3px solid var(--color-primary)' : 'none'
          }}>
            <span className={`bubble ${m.dir === 'out' ? 'bubble-out' : 'bubble-in'}`}>{m.text}</span>
            <div style={{ fontSize: '0.7rem', color: '#666', display: 'flex', alignItems: 'center', gap: 8, justifyContent: m.dir === 'out' ? 'flex-end' : 'flex-start' }}>
              <span>{m.dir === 'out' ? `To: ${m.peer}` : `From: ${m.peer}`}</span>
              {m.thid && <span style={{ fontFamily: 'monospace', fontSize: '0.65rem' }}>thid: {m.thid.substring(0, 8)}...</span>}
              {m.dir === 'in' && (
                <button 
                  className="btn btn-outline" 
                  style={{ fontSize: '0.65rem', padding: '2px 6px' }}
                  onClick={() => setReplyingTo(m)}
                >
                  Reply
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
