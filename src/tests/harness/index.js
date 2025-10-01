// Older working tests
import { packMessageTest } from '../core/packMessage';
import { 
  unpackMessageTest,
  unpackMessagePlainTest,
  unpackMessageSignedTest,
  unpackMessageEncryptedTest,
  unpackMessageSignedEncryptedTest
} from '../core/unpackMessage';
import { discoverFeaturesTest, discoverFeaturesObjectQueryTest } from '../protocols/discoverFeatures';
import { 
  checkDidcommPermissionTest,
  checkMultipleDidcommPermissionsTest,
  requestDidcommPermissionsTest,
  listGrantedDidcommPermissionsTest,
  requestAllDidcommPermissionsTest
} from '../security/protocolPermissions';
import { attachmentsAllTest, attachmentsInlineTest, attachmentsExternalTest, attachmentsMultipleTest } from '../protocols/attachments';
import { peerDidSameTest } from '../core/peerDidSame';
import { basicThidTest, replyThidTest, multiMessageConversationTest, thidErrorHandlingTest, emptyReplyToTest } from '../core/messageThreading';
import {
  thidWithEmptyReplyToTest,
  thidWithNullReplyToTest,
  thidWithMalformedReplyToTest,
  thidWithPartialEnvelopeReplyToTest,
  thidConsistencyAcrossMultipleUnpacksTest,
  thidWithVeryLongConversationChainTest,
  thidWithConcurrentMessagesTest,
  extractThidWithVariousFormatsTest,
  thidWithSpecialCharactersTest,
} from '../core/thidEdgeCases';

// Converted wrappers
import { integrationSuiteTest, securityComprehensiveTest, protocolEdgeCasesTest, permissionsHelpersConvertedTest, protocolHelpersConvertedTest } from './converted-tests';

// SDK component wrappers
import {
  sdkClientIndexTest,
  sdkClientMessengerTest,
  sdkClientPermissionsTest,
  sdkClientProtocolsTest,
  sdkServiceWorkerRpcTest,
  sdkServiceWorkerPermissionsTest,
  sdkProtocolBasicMessageTest,
  sdkProtocolDiscoverFeaturesTest,
  sdkUtilsAttachmentsTest,
  sdkProtocolUserProfileTest,
  sdkProtocolShareMediaTest,
  sdkProtocolReportProblemTest,
} from './sdk-component-tests';

// Advanced Security suites and individual tests
import {
  securityAttackTests as securityAttacksSuite,
  attackPlaintextUnicast,
  attackSignedOnlyUnicast,
  attackPlaintextJwm,
  attackOversize,
  attackTamper,
  attackReplay,
  attackBackpressure,
  attackBtcIdTampering,
  attackBtcIdReuse,
  attackProtectedHeaderValidation,
  attackJweStructureValidation,
  attackErrorCodeSpecificity,
} from '../security/securityAttacks';
import {
  routerPipelineTests as routerPipelineSuite,
  joseParsingValidationTest,
  joseConsistencyValidationTest,
  cipherPolicyValidationTest,
  requiredFieldsValidationTest,
  transportPostureEnforcementTest,
  btcAssociationValidationTest,
  pipelineOrderingValidationTest,
  errorResponseConsistencyTest,
} from '../security/routerPipelineTests';
import {
  odbSecurityTests as odbSecuritySuite,
  odbCreationValidationTest,
  ctHashValidationTest,
  nonceReplayProtectionTest,
  timeWindowValidationTest,
  originVerificationTest,
  canonicalBytesValidationTest,
} from '../security/odbSecurityTests';
import {
  adversarialBreakTests as adversarialBreakSuite,
  btcIdOverflowApocalypseTest,
  extremeRaceConditionTest,
  unicodeApocalypseTest,
  jsonNuclearBombTest,
  precisionTimingAttackTest,
  extremeMemoryExhaustionTest,
  advancedCrossOriginPollutionTest,
  ultimateHeaderInjectionTest,
} from '../security/adversarialBreakTests';

// Environment utilities
export { checkEnvironmentReadiness, ensureSDKReady, getEnvironmentInfo } from './environment-utils';

export const coreDIDCommTests = {
  peerDidSame: peerDidSameTest,
  packMessage: packMessageTest,
  unpackMessage: unpackMessageTest,
  unpackMessagePlain: unpackMessagePlainTest,
  unpackMessageSigned: unpackMessageSignedTest,
  unpackMessageEncrypted: unpackMessageEncryptedTest,
  unpackMessageSignedEncrypted: unpackMessageSignedEncryptedTest,
};

export const permissionsAndSecurityTests = {
  checkPermission: checkDidcommPermissionTest,
  checkMultiplePermissions: checkMultipleDidcommPermissionsTest,
  requestPermissions: requestDidcommPermissionsTest,
  listGrantedPermissions: listGrantedDidcommPermissionsTest,
  requestAllPermissions: requestAllDidcommPermissionsTest,
  securityComprehensive: securityComprehensiveTest,
};

export const protocolTests = {
  discoverFeatures: discoverFeaturesTest,
  discoverFeaturesObjectQuery: discoverFeaturesObjectQueryTest,
  attachmentsAll: attachmentsAllTest,
  attachmentsInline: attachmentsInlineTest,
  attachmentsExternal: attachmentsExternalTest,
  attachmentsMultiple: attachmentsMultipleTest,
  protocolEdgeCases: protocolEdgeCasesTest,
};

export const sdkComponentTests = {
  clientIndex: sdkClientIndexTest,
  clientMessenger: sdkClientMessengerTest,
  clientPermissions: sdkClientPermissionsTest,
  clientProtocols: sdkClientProtocolsTest,
  serviceWorkerRpc: sdkServiceWorkerRpcTest,
  serviceWorkerPermissions: sdkServiceWorkerPermissionsTest,
  protocolBasicMessage: sdkProtocolBasicMessageTest,
  protocolDiscoverFeatures: sdkProtocolDiscoverFeaturesTest,
  utilsAttachments: sdkUtilsAttachmentsTest,
  protocolUserProfile: sdkProtocolUserProfileTest,
  protocolShareMedia: sdkProtocolShareMediaTest,
  protocolReportProblem: sdkProtocolReportProblemTest,
};

export const convertedSuites = {
  integrationSuite: integrationSuiteTest,
  permissionsHelpers: permissionsHelpersConvertedTest,
  protocolHelpers: protocolHelpersConvertedTest,
};

export const threadingTests = {
  basicThid: basicThidTest,
  replyThid: replyThidTest,
  multiMessageConversation: multiMessageConversationTest,
  thidErrorHandling: thidErrorHandlingTest,
  emptyReplyTo: emptyReplyToTest,
  thidWithEmptyReplyTo: thidWithEmptyReplyToTest,
  thidWithNullReplyTo: thidWithNullReplyToTest,
  thidWithMalformedReplyTo: thidWithMalformedReplyToTest,
  thidWithPartialEnvelopeReplyTo: thidWithPartialEnvelopeReplyToTest,
  thidConsistencyAcrossMultipleUnpacks: thidConsistencyAcrossMultipleUnpacksTest,
  thidWithVeryLongConversationChain: thidWithVeryLongConversationChainTest,
  thidWithConcurrentMessages: thidWithConcurrentMessagesTest,
  extractThidWithVariousFormats: extractThidWithVariousFormatsTest,
  thidWithSpecialCharacters: thidWithSpecialCharactersTest,
};

// New: Advanced Security category aggregating adversarial, ODB, and Router pipeline
export const securityAttackTests = {
  // Individuals
  attackPlaintextUnicast,
  attackSignedOnlyUnicast,
  attackPlaintextJwm,
  attackOversize,
  attackTamper,
  attackReplay,
  attackBackpressure,
  attackBtcIdTampering,
  attackBtcIdReuse,
  attackProtectedHeaderValidation,
  attackJweStructureValidation,
  attackErrorCodeSpecificity,
};

export const routerPipelineTests = {
  // Individuals
  joseParsingValidation: joseParsingValidationTest,
  joseConsistencyValidation: joseConsistencyValidationTest,
  cipherPolicyValidation: cipherPolicyValidationTest,
  requiredFieldsValidation: requiredFieldsValidationTest,
  transportPostureEnforcement: transportPostureEnforcementTest,
  btcAssociationValidation: btcAssociationValidationTest,
  pipelineOrderingValidation: pipelineOrderingValidationTest,
  errorResponseConsistency: errorResponseConsistencyTest,
};

export const odbSecurityTests = {
  // Individuals
  odbCreationValidation: odbCreationValidationTest,
  ctHashValidation: ctHashValidationTest,
  nonceReplayProtection: nonceReplayProtectionTest,
  timeWindowValidation: timeWindowValidationTest,
  originVerification: originVerificationTest,
  canonicalBytesValidation: canonicalBytesValidationTest,
};

export const adversarialBreakTests = {
  // Individuals
  btcIdOverflowApocalypse: btcIdOverflowApocalypseTest,
  extremeRaceCondition: extremeRaceConditionTest,
  unicodeApocalypse: unicodeApocalypseTest,
  jsonNuclearBomb: jsonNuclearBombTest,
  precisionTimingAttack: precisionTimingAttackTest,
  extremeMemoryExhaustion: extremeMemoryExhaustionTest,
  advancedCrossOriginPollution: advancedCrossOriginPollutionTest,
  ultimateHeaderInjection: ultimateHeaderInjectionTest,
};


