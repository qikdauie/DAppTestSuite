import { getReadyDecentClient } from 'decent_app_sdk';

export async function packMessageTest() {
  const msgr = await getReadyDecentClient();
  if (!msgr || typeof msgr.pack !== 'function' || typeof msgr.getDID !== 'function') {
    throw new Error('Service worker pack/getDID is not available.');
  }

  const { did } = await msgr.getDID();
  const bodyJson = JSON.stringify({ timestamp: Date.now(), note: 'unit-test' });

  let result;
  try {
    result = await msgr.pack(did, "https://didcomm.org/basicmessage/2.0/message", bodyJson, [], "");
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