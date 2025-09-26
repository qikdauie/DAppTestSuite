import { getReadyDecentClient} from 'decent_app_sdk';
import { MessageTypes } from 'decent_app_sdk/constants';

export async function packMessageTest() {
  const msgr = await getReadyDecentClient();
  try { await msgr.protocols.refresh(); } catch {}
  if (!msgr || typeof msgr.pack !== 'function' || typeof msgr.getDID !== 'function') {
    throw new Error('Service worker pack/getDID is not available.');
  }

  const { did } = await msgr.getDID();
  const bodyJson = JSON.stringify({ timestamp: Date.now(), note: 'unit-test' });

  // Intentionally exercising low-level pack() for regression coverage
  let result;
  try {
    result = await msgr.pack(did, MessageTypes.BASIC_MESSAGE.MESSAGE, bodyJson, [], "");
  } catch (err) {
    return { pass: false, error: err.message };
  }

  let isJWE = false;
  try {
    const parsed = JSON.parse(result.message);
    isJWE = !!(parsed.protected && parsed.recipients && parsed.ciphertext);
  } catch (e) {
    isJWE = false;
  }

  return {
    pass: result?.success === true && isJWE,
    result,
    jwe: { isJWE }
  };
}