// DIDComm Permissions API tests
import { getReadyDecentClient} from 'decent_app_sdk';
import { PIURI, MessageTypes, PermissionMethods } from 'decent_app_sdk/constants';

const SAMPLE_PROTOCOL = PIURI.BASIC_MESSAGE_V1;
const SAMPLE_PROTOCOL_NAME = 'DEV-Basic Message';
const SAMPLE_PROTOCOL_DESCRIPTION = 'DEV-Send a basic message to a DID';
const SAMPLE_MESSAGE_TYPE = MessageTypes.BASIC_MESSAGE.MESSAGE;
const SAMPLE_MESSAGE_TYPE_DESCRIPTION = 'DEV-Send a basic message to a DID';

export async function checkDidcommPermissionTest(protocol = SAMPLE_PROTOCOL, messageTypeUri = SAMPLE_MESSAGE_TYPE) {
  const msgr = await getReadyDecentClient();
  try { await msgr.protocols.refresh(); } catch {}
  let result, error = null;
  try {
    result = await msgr.permissions.check(protocol, messageTypeUri);
  } catch (err) {
    error = err;
  }
  const pass = error === null && typeof result === 'boolean';
  return { pass, request: { protocol, messageTypeUri }, response: result, error: error ? String(error) : null };
}

export async function checkMultipleDidcommPermissionsTest(protocols = [PIURI.APP_INTENT_V1], messageTypeUris = [SAMPLE_MESSAGE_TYPE, `${PIURI.APP_INTENT_V1}/pick-datetime-request`, `${PIURI.APP_INTENT_V1}/compose-email-request`]) {
  const msgr = await getReadyDecentClient();
  try { await msgr.protocols.refresh(); } catch {}
  let result, error = null;
  try {
    result = await msgr.permissions.checkMultiple(protocols, messageTypeUris);
  } catch (err) {
    error = err;
  }
  const pass = error === null && Array.isArray(result) && result.every(v => typeof v === 'boolean');
  return { pass, request: { protocols, messageTypeUris }, response: result, error: error ? String(error) : null };
}

export async function requestDidcommPermissionsTest(requests = [
  { protocolUri: PIURI.APP_INTENT_V1, protocolName: 'DEV-App Intent', description: 'DEV-App like inter-site functionality',
    messageTypes: [
        { typeUri: `${PIURI.APP_INTENT_V1}/share-response`, description: 'DEV-Share result (response)' },
        { typeUri: `${PIURI.APP_INTENT_V1}/pick-datetime-request`, description: 'DEV-Pick a date/time (request)' },
        { typeUri: `${PIURI.APP_INTENT_V1}/pick-datetime-response`, description: 'DEV-Pick a date/time result (response)' },
        { typeUri: `${PIURI.APP_INTENT_V1}/compose-email-request`, description: 'DEV-Compose email (request)' },
        { typeUri: `${PIURI.APP_INTENT_V1}/compose-email-response`, description: 'DEV-Compose email result (response)' },
  ], requireAllMessageTypes: false },
  { protocolUri: PIURI.TRUST_PING_V2, protocolName: 'DEV-Trust Ping', description: 'DEV-Ping a DID to check if it is online',
      messageTypes: [
        { typeUri: MessageTypes.TRUST_PING.PING, description: 'DEV-Ping a DID to check if it is online' },
        { typeUri: MessageTypes.TRUST_PING.PING_RESPONSE, description: 'DEV-Ping response' }],
    requireAllMessageTypes: false },
  { protocolUri: PIURI.BASIC_MESSAGE_V1, protocolName: 'DEV-Basic Message', description: 'DEV-Send a basic message to a DID', messageTypes: [
    { typeUri: MessageTypes.BASIC_MESSAGE.MESSAGE, description: 'DEV-Send a basic message to a DID' }], requireAllMessageTypes: false },
  ]) {
  const msgr = await getReadyDecentClient();
  try { await msgr.protocols.refresh(); } catch {}
  let result, error = null;
  try {
    result = await msgr.permissions.request(requests);
  } catch (err) {
    error = err;
  }
  const pass = error === null && result && typeof result === 'object';
  return { pass, request: { requests }, response: result, error: error ? String(error) : null };
}

export async function listGrantedDidcommPermissionsTest(protocols = [SAMPLE_PROTOCOL, PIURI.TRUST_PING_V2, PIURI.BASIC_MESSAGE_V1]) {
  const msgr = await getReadyDecentClient();
  try { await msgr.protocols.refresh(); } catch {}
  let result, error = null;
  try {
    result = await msgr.permissions.listGranted(protocols);
  } catch (err) {
    error = err;
  }
  const pass = error === null && Array.isArray(result);
  return { pass, request: { protocols }, response: result, error: error ? String(error) : null };
}


// Request every known DIDComm permission from the protocol registry to verify UI rendering
export async function requestAllDidcommPermissionsTest() {
  const msgr = await getReadyDecentClient();

  const requests = [
    {
      protocolUri: PIURI.BASIC_MESSAGE_V1,
      protocolName: 'Basic Messaging',
      description: 'DEV-Exchange text messages',
      messageTypes: [
        { typeUri: MessageTypes.BASIC_MESSAGE.MESSAGE, description: 'DEV-Send text message' },
      ],
      requireAllMessageTypes: false,
    },
    {
      protocolUri: PIURI.PRESENT_PROOF_V2,
      protocolName: 'Credential Verification',
      description: 'DEV-Share and verify digital credentials',
      messageTypes: [
        { typeUri: MessageTypes.PRESENT_PROOF.PROPOSE_PRESENTATION, description: 'DEV-Suggest credential to share' },
        { typeUri: MessageTypes.PRESENT_PROOF.REQUEST_PRESENTATION, description: 'DEV-Request credential verification' },
        { typeUri: MessageTypes.PRESENT_PROOF.PRESENTATION, description: 'DEV-Share credential proof' },
      ],
      requireAllMessageTypes: false,
    },
    {
      protocolUri: PIURI.ISSUE_CREDENTIAL_V2,
      protocolName: 'Credential Issuance',
      description: 'DEV-Receive and manage digital credentials',
      messageTypes: [
        { typeUri: MessageTypes.ISSUE_CREDENTIAL.PROPOSE_CREDENTIAL, description: 'DEV-Request specific credential' },
        { typeUri: MessageTypes.ISSUE_CREDENTIAL.OFFER_CREDENTIAL, description: 'DEV-Receive credential offer' },
        { typeUri: MessageTypes.ISSUE_CREDENTIAL.REQUEST_CREDENTIAL, description: 'DEV-Accept credential offer' },
        { typeUri: MessageTypes.ISSUE_CREDENTIAL.ISSUE_CREDENTIAL, description: 'DEV-Store issued credential' },
      ],
      requireAllMessageTypes: false,
    },
    {
      protocolUri: PIURI.TRUST_PING_V2,
      protocolName: 'Connection Test',
      description: 'DEV-Test secure connections',
      messageTypes: [
        { typeUri: MessageTypes.TRUST_PING.PING, description: 'DEV-Test connection' },
        { typeUri: MessageTypes.TRUST_PING.PING_RESPONSE, description: 'DEV-Respond to connection test' },
      ],
      requireAllMessageTypes: false,
    },
    {
      protocolUri: PIURI.DISCOVER_FEATURES_V2,
      protocolName: 'Feature Discovery',
      description: 'DEV-Discover available features',
      messageTypes: [
        { typeUri: MessageTypes.DISCOVER_FEATURES.QUERIES, description: 'DEV-Query supported features' },
        { typeUri: MessageTypes.DISCOVER_FEATURES.DISCLOSE, description: 'DEV-Share supported features' },
      ],
      requireAllMessageTypes: false,
    },
    {
      protocolUri: PIURI.OUT_OF_BAND_V2,
      protocolName: 'Connection Invites',
      description: 'DEV-Share invitation links and QR codes',
      messageTypes: [
        { typeUri: MessageTypes.OUT_OF_BAND.INVITATION, description: 'DEV-Share invitation' },
      ],
      requireAllMessageTypes: false,
    },
    {
      protocolUri: PIURI.REPORT_PROBLEM_V2,
      protocolName: 'Error Reporting',
      description: 'DEV-Report errors and issues',
      messageTypes: [
        { typeUri: MessageTypes.REPORT_PROBLEM.PROBLEM_REPORT, description: 'DEV-Send error report' },
      ],
      requireAllMessageTypes: false,
    },
    {
      protocolUri: PIURI.ACTION_MENU_V1,
      protocolName: 'Interactive Menus',
      description: 'DEV-Display and interact with action menus',
      messageTypes: [
        { typeUri: MessageTypes.ACTION_MENU.MENU_REQUEST, description: 'DEV-Request action menu' },
        { typeUri: MessageTypes.ACTION_MENU.MENU, description: 'DEV-Display action menu' },
        { typeUri: MessageTypes.ACTION_MENU.PERFORM, description: 'DEV-Execute menu action' },
      ],
      requireAllMessageTypes: false,
    },
    {
      protocolUri: PIURI.USER_PROFILE_V1,
      protocolName: 'Profile Sharing',
      description: 'DEV-Share basic profile information',
      messageTypes: [
        { typeUri: MessageTypes.USER_PROFILE.REQUEST_PROFILE, description: 'DEV-Request profile information' },
        { typeUri: MessageTypes.USER_PROFILE.PROFILE, description: 'DEV-Share profile information' },
      ],
      requireAllMessageTypes: false,
    },
    {
      protocolUri: PIURI.DIDEXCHANGE_V1_1,
      protocolName: 'Connection Setup',
      description: 'DEV-Establish secure connections',
      messageTypes: [
        { typeUri: MessageTypes.DIDEXCHANGE.REQUEST, description: 'DEV-Request new connection' },
        { typeUri: MessageTypes.DIDEXCHANGE.RESPONSE, description: 'DEV-Accept connection request' },
        { typeUri: MessageTypes.DIDEXCHANGE.COMPLETE, description: 'DEV-Finalize connection' },
        { typeUri: MessageTypes.DIDEXCHANGE.PROBLEM_REPORT, description: 'DEV-Report connection error' },
      ],
      requireAllMessageTypes: false,
    },
    {
      protocolUri: PIURI.SHARE_MEDIA_V1,
      protocolName: 'File Sharing',
      description: 'DEV-Share files and media securely',
      messageTypes: [
        { typeUri: MessageTypes.SHARE_MEDIA.SHARE, description: 'DEV-Share files and media' },
        { typeUri: MessageTypes.SHARE_MEDIA.REQUEST, description: 'DEV-Request shared files' },
      ],
      requireAllMessageTypes: false,
    },
    {
      protocolUri: PIURI.APP_INTENT_V1,
      protocolName: 'App Actions',
      description: 'DEV-Perform actions through other apps',
      messageTypes: [
        // Control
        { typeUri: `${PIURI.APP_INTENT_V1}/decline`, description: 'DEV-Provider refusal with reason' },
        { typeUri: `${PIURI.APP_INTENT_V1}/progress`, description: 'DEV-Optional progress updates' },
        { typeUri: `${PIURI.APP_INTENT_V1}/cancel`, description: 'DEV-Caller cancellation while in-flight' },
        // Content and communication
        { typeUri: `${PIURI.APP_INTENT_V1}/share-request`, description: 'DEV-Share text/URLs/small files' },
        { typeUri: `${PIURI.APP_INTENT_V1}/share-response`, description: 'DEV-Response to share request' },
        { typeUri: `${PIURI.APP_INTENT_V1}/compose-email-request`, description: 'DEV-Compose or send an email' },
        { typeUri: `${PIURI.APP_INTENT_V1}/compose-email-response`, description: 'DEV-Response to compose email request' },
        { typeUri: `${PIURI.APP_INTENT_V1}/dial-call-request`, description: 'DEV-Initiate a phone/VoIP call' },
        { typeUri: `${PIURI.APP_INTENT_V1}/dial-call-response`, description: 'DEV-Response to dial call request' },
        { typeUri: `${PIURI.APP_INTENT_V1}/open-url-request`, description: 'DEV-Open a URL to view or edit' },
        { typeUri: `${PIURI.APP_INTENT_V1}/open-url-response`, description: 'DEV-Response to open URL request' },
        // File and data selection
        { typeUri: `${PIURI.APP_INTENT_V1}/pick-file-request`, description: 'DEV-User picks file(s)' },
        { typeUri: `${PIURI.APP_INTENT_V1}/pick-file-response`, description: 'DEV-Response to pick file request' },
        { typeUri: `${PIURI.APP_INTENT_V1}/pick-contact-request`, description: 'DEV-User picks contact(s)' },
        { typeUri: `${PIURI.APP_INTENT_V1}/pick-contact-response`, description: 'DEV-Response to pick contact request' },
        { typeUri: `${PIURI.APP_INTENT_V1}/pick-datetime-request`, description: 'DEV-User picks a date/time or range' },
        { typeUri: `${PIURI.APP_INTENT_V1}/pick-datetime-response`, description: 'DEV-Response to pick datetime request' },
        { typeUri: `${PIURI.APP_INTENT_V1}/pick-location-request`, description: 'DEV-User picks a geographic location' },
        { typeUri: `${PIURI.APP_INTENT_V1}/pick-location-response`, description: 'DEV-Response to pick location request' },
        // Media capture
        { typeUri: `${PIURI.APP_INTENT_V1}/capture-photo-request`, description: 'DEV-Capture a still photo' },
        { typeUri: `${PIURI.APP_INTENT_V1}/capture-photo-response`, description: 'DEV-Response to capture photo request' },
        { typeUri: `${PIURI.APP_INTENT_V1}/capture-video-request`, description: 'DEV-Capture video' },
        { typeUri: `${PIURI.APP_INTENT_V1}/capture-video-response`, description: 'DEV-Response to capture video request' },
        { typeUri: `${PIURI.APP_INTENT_V1}/capture-audio-request`, description: 'DEV-Record audio' },
        { typeUri: `${PIURI.APP_INTENT_V1}/capture-audio-response`, description: 'DEV-Response to capture audio request' },
        // Scanning and recognition
        { typeUri: `${PIURI.APP_INTENT_V1}/scan-qr-request`, description: 'DEV-Scan QR/Barcode' },
        { typeUri: `${PIURI.APP_INTENT_V1}/scan-qr-response`, description: 'DEV-Response to scan QR request' },
        { typeUri: `${PIURI.APP_INTENT_V1}/scan-document-request`, description: 'DEV-Scan/deskew document' },
        { typeUri: `${PIURI.APP_INTENT_V1}/scan-document-response`, description: 'DEV-Response to scan document request' },
        // Navigation and location
        { typeUri: `${PIURI.APP_INTENT_V1}/open-map-navigation-request`, description: 'DEV-Launch navigation' },
        { typeUri: `${PIURI.APP_INTENT_V1}/open-map-navigation-response`, description: 'DEV-Response to open map navigation request' },
        // Calendar and contact management
        { typeUri: `${PIURI.APP_INTENT_V1}/add-calendar-event-request`, description: 'DEV-Add/update a calendar event' },
        { typeUri: `${PIURI.APP_INTENT_V1}/add-calendar-event-response`, description: 'DEV-Response to add calendar event request' },
        { typeUri: `${PIURI.APP_INTENT_V1}/add-contact-request`, description: 'DEV-Add/update a contact' },
        { typeUri: `${PIURI.APP_INTENT_V1}/add-contact-response`, description: 'DEV-Response to add contact request' },
        // File operations
        { typeUri: `${PIURI.APP_INTENT_V1}/save-to-request`, description: 'DEV-Save bytes to a location' },
        { typeUri: `${PIURI.APP_INTENT_V1}/save-to-response`, description: 'DEV-Response to save to request' },
        { typeUri: `${PIURI.APP_INTENT_V1}/print-request`, description: 'DEV-Print via a provider' },
        { typeUri: `${PIURI.APP_INTENT_V1}/print-response`, description: 'DEV-Response to print request' },
        // Text processing
        { typeUri: `${PIURI.APP_INTENT_V1}/translate-request`, description: 'DEV-Translate text or a document' },
        { typeUri: `${PIURI.APP_INTENT_V1}/translate-response`, description: 'DEV-Response to translate request' },
        // Financial and security
        { typeUri: `${PIURI.APP_INTENT_V1}/pay-request`, description: 'DEV-Authorize/execute a payment' },
        { typeUri: `${PIURI.APP_INTENT_V1}/pay-response`, description: 'DEV-Response to pay request' },
        { typeUri: `${PIURI.APP_INTENT_V1}/sign-request`, description: 'DEV-Produce a digital signature' },
        { typeUri: `${PIURI.APP_INTENT_V1}/sign-response`, description: 'DEV-Response to sign request' },
        { typeUri: `${PIURI.APP_INTENT_V1}/verify-signature-request`, description: 'DEV-Verify a signature' },
        { typeUri: `${PIURI.APP_INTENT_V1}/verify-signature-response`, description: 'DEV-Response to verify signature request' },
        // Crypto operations
        { typeUri: `${PIURI.APP_INTENT_V1}/encrypt-request`, description: 'DEV-Encrypt a payload' },
        { typeUri: `${PIURI.APP_INTENT_V1}/encrypt-response`, description: 'DEV-Response to encrypt request' },
        { typeUri: `${PIURI.APP_INTENT_V1}/decrypt-request`, description: 'DEV-Decrypt a payload' },
        { typeUri: `${PIURI.APP_INTENT_V1}/decrypt-response`, description: 'DEV-Response to decrypt request' },
      ],
      requireAllMessageTypes: false,
    },
  ];

  let result, error = null;
  try {
    result = await msgr.permissions.request(requests);
  } catch (err) {
    error = err;
  }

  const pass = error === null && result && typeof result === 'object';
  return { pass, request: { requests }, response: result, error: error ? String(error) : null };
}


