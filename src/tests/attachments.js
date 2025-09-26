import { getReadyDecentClient} from 'decent_app_sdk';
import { MessageTypes } from 'decent_app_sdk/constants';
import { normalizeAttachments } from '../../submodules/decent_app_sdk/src/utils/attachments.js';

function makeInlineTextAttachment(id, text, filename = 'note.txt', description = 'Inline text attachment') {
  // Use base64 to keep transport deterministic across environments
  const base64 = btoa(text);
  return {
    id,
    mimeType: 'text/plain',
    filename: filename ?? '',
    description: description ?? '',
    data: base64 ?? '',
  };
}

function makeExternalAttachment(id, url, mimeType = 'application/octet-stream', filename, description = 'External attachment') {
  return {
    id,
    mimeType,
    filename: filename ?? '',
    description: description ?? '',
    data: '',
    externalUrl: url ?? '',
  };
}

async function packUnpack(msgr, did, bodyObj, attachments) {
  const bodyJson = JSON.stringify(bodyObj);
  const packed = await msgr.pack(
    did,
    MessageTypes.BASIC_MESSAGE.MESSAGE,
    bodyJson,
    attachments,
    ''
  );
  if (!packed?.success) {
    return { pass: false, step: 'pack', packed };
  }
  const unpacked = await msgr.unpack(packed.message);
  if (!unpacked?.success) {
    return { pass: false, step: 'unpack', packed, unpacked };
  }
  let envelope;
  try { envelope = JSON.parse(unpacked.message); } catch (e) { envelope = null; }
  if (envelope) {
    envelope.attachments = normalizeAttachments(envelope.attachments || []);
  }
  return { pass: !!envelope, packed, unpacked, envelope };
}

export async function attachmentsInlineTest() {
  const msgr = await getReadyDecentClient();
  try { await msgr.protocols.refresh(); } catch {}
  const { did } = await msgr.getDID();

  const text = 'Hello, DIDComm Attachments!';
  const att = makeInlineTextAttachment('att-text', text, 'hello.txt');
  const result = await packUnpack(msgr, did, { note: 'inline-attachment' }, [att]);
  if (!result.pass) return { pass: false, ...result };

  const atts = Array.isArray(result.envelope?.attachments) ? result.envelope.attachments : [];
  const first = atts[0] || null;

  const sameId = first?.id === att.id;
  const sameMime = first?.mimeType === att.mimeType;
  const sameFilename = first?.filename === att.filename;
  const sameData = typeof first?.data === 'string' && first.data === att.data;
  const pass = sameId && sameMime && sameFilename && sameData;
  return {
    pass,
    expected: att,
    got: first,
    envelope: result.envelope,
  };
}

export async function attachmentsExternalTest() {
  const msgr = await getReadyDecentClient();
  try { await msgr.protocols.refresh(); } catch {}
  const { did } = await msgr.getDID();

  const url = 'https://example.com/image.jpg';
  const att = makeExternalAttachment('att-external', url, 'image/jpeg', 'image.jpg');
  const result = await packUnpack(msgr, did, { note: 'external-attachment' }, [att]);
  if (!result.pass) return { pass: false, ...result };

  const atts = Array.isArray(result.envelope?.attachments) ? result.envelope.attachments : [];
  const first = atts[0] || null;

  const sameId = first?.id === att.id;
  const sameMime = first?.mimeType === att.mimeType;
  const sameFilename = first?.filename === att.filename;
  const sameUrl = first?.externalUrl === att.externalUrl;
  const pass = sameId && sameMime && sameFilename && sameUrl;
  return {
    pass,
    expected: att,
    got: first,
    envelope: result.envelope,
  };
}

export async function attachmentsMultipleTest() {
  const msgr = await getReadyDecentClient();
  try { await msgr.protocols.refresh(); } catch {}
  const { did } = await msgr.getDID();

  const inline = makeInlineTextAttachment('inline-1', 'Alpha');
  const external = makeExternalAttachment('ext-1', 'https://example.com/doc.pdf', 'application/pdf', 'doc.pdf');
  const result = await packUnpack(msgr, did, { note: 'multiple-attachments' }, [inline, external]);
  if (!result.pass) return { pass: false, ...result };

  const atts = Array.isArray(result.envelope?.attachments) ? result.envelope.attachments : [];
  const countOk = atts.length === 2;
  const ids = new Set(atts.map(a => a?.id));
  const haveBoth = ids.has(inline.id) && ids.has(external.id);

  const pass = countOk && haveBoth;
  return {
    pass,
    expectedIds: [inline.id, external.id],
    gotIds: atts.map(a => a?.id),
    envelope: result.envelope,
  };
}

export async function attachmentsAllTest() {
  const [inline, external, multiple] = await Promise.all([
    attachmentsInlineTest(),
    attachmentsExternalTest(),
    attachmentsMultipleTest(),
  ]);
  const pass = inline.pass && external.pass && multiple.pass;
  return { pass, results: { inline, external, multiple } };
}


