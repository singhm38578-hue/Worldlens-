import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  buildScanRecordPayload,
  buildTranslationRecordPayload,
  buildUserProfileCreatePayload,
  buildUserProfileUpdatePayload,
  FIREBASE_SCHEMA_LIMITS,
  mapFirestoreScanDoc,
  mapFirestoreTranslationDoc,
  sanitizeFirestoreDocId,
} from './src/data/firestorePayloadBuilder';

const ROOT = process.cwd();
const rulesText = fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8');
const blueprint = JSON.parse(fs.readFileSync(path.join(ROOT, 'firebase-blueprint.json'), 'utf8')) as {
  entities: Record<
    string,
    {
      properties: Record<string, { maxLength?: number; minLength?: number; enum?: string[] }>;
      required: string[];
    }
  >;
  firestore: Record<string, { schema: { $ref: string } }>;
};

test('firestore.rules enforces Eight Pillars security invariants', () => {
  // 1. Default-deny catch-all safety net
  assert.match(rulesText, /match \/\{document=\*\*\}\s*\{\s*allow read, write: if false;\s*\}/);

  // 2. Email-verified owner enforcement on writes
  assert.match(rulesText, /request\.auth\.token\.email_verified == true/);
  assert.match(rulesText, /function isVerifiedOwner\(userId\)/);

  // 3. No blanket isSignedIn() read leaks and /users list denied
  assert.match(rulesText, /allow list: if false;/);
  assert.doesNotMatch(rulesText, /allow (read|get|list): if isSignedIn\(\)\s*;/);

  // 4. ID validation regex and max length 128
  assert.match(rulesText, /function isValidId\(id\)/);
  assert.match(rulesText, /id\.size\(\) <= 128/);

  // 5. Master Gate exists() on subcollection writes
  assert.match(rulesText, /function parentUserExists\(userId\)/);
  assert.match(rulesText, /exists\(\/databases\/\$\(database\)\/documents\/users\/\$\(userId\)\)/);

  // 6. Immutable history subcollections (updates denied)
  assert.equal((rulesText.match(/allow update: if false;/g) ?? []).length, 2);

  // 7. Strict server timestamp checks
  assert.match(rulesText, /incoming\(\)\.createdAt == request\.time/);
  assert.match(rulesText, /incoming\(\)\.updatedAt == request\.time/);

  // 8. Safe allow list without get()/exists()
  const listRuleMatches = rulesText.match(/allow list: if[\s\S]*?;/g) ?? [];
  assert.equal(listRuleMatches.length, 3);
  for (const listRule of listRuleMatches) {
    assert.doesNotMatch(listRule, /\b(get|exists)\(/);
  }
});

test('firestore.rules is strictly synchronized with firebase-blueprint.json required keys & limits', () => {
  const userRequired = blueprint.entities.UserProfile.required;
  const scanRequired = blueprint.entities.ScanRecord.required;
  const translationRequired = blueprint.entities.TranslationRecord.required;

  for (const field of [...userRequired, ...scanRequired, ...translationRequired]) {
    assert.ok(rulesText.includes(`'${field}'`), `Expected firestore.rules to validate field '${field}'`);
  }

  // Verify no binary image fields are allowed in ScanRecord
  assert.ok(!scanRequired.includes('thumbnailDataUrl'));
  assert.ok(!scanRequired.includes('imageBase64'));
  assert.ok(!rulesText.includes('thumbnailDataUrl'));
  assert.ok(!rulesText.includes('imageBase64'));

  // Verify numeric bounds match blueprint exactly
  assert.equal(
    blueprint.entities.UserProfile.properties.displayName.maxLength,
    FIREBASE_SCHEMA_LIMITS.displayNameMaxLength
  );
  assert.equal(
    blueprint.entities.ScanRecord.properties.objectName.maxLength,
    FIREBASE_SCHEMA_LIMITS.objectNameMaxLength
  );
  assert.equal(
    blueprint.entities.ScanRecord.properties.explanation.maxLength,
    FIREBASE_SCHEMA_LIMITS.explanationMaxLength
  );
  assert.equal(
    blueprint.entities.TranslationRecord.properties.sourceText.maxLength,
    FIREBASE_SCHEMA_LIMITS.sourceTextMaxLength
  );
  assert.equal(
    blueprint.entities.TranslationRecord.properties.translatedText.maxLength,
    FIREBASE_SCHEMA_LIMITS.translatedTextMaxLength
  );
});

test('Dirty Dozen payload protections: defensive builders enforce exact schema keys, bounds, and ID hygiene', () => {
  const sentinelTs = { _type: 'SERVER_TIMESTAMP' };

  // 1. UserProfile create has exact blueprint keys (no shadow fields)
  const profileCreate = buildUserProfileCreatePayload({
    ownerId: 'user_abc_123',
    displayName: 'A'.repeat(500),
    preferredLanguage: 'hi',
    timestamp: sentinelTs,
  });
  assert.deepEqual(Object.keys(profileCreate).sort(), [...blueprint.entities.UserProfile.required].sort());
  assert.equal(profileCreate.displayName.length, FIREBASE_SCHEMA_LIMITS.displayNameMaxLength);
  assert.equal(profileCreate.preferredLanguage, 'hi');

  // 2. UserProfile update only includes allowed mutable action keys
  const profileUpdate = buildUserProfileUpdatePayload({
    preferredLanguage: 'en',
    timestamp: sentinelTs,
  });
  assert.deepEqual(Object.keys(profileUpdate).sort(), ['preferredLanguage', 'updatedAt']);

  // 3. ScanRecord clamps overflow strings & arrays (max 10 items, max 400 chars each) and never includes thumbnails
  const oversizedList = Array.from({ length: 25 }, (_, i) => `item-${i}-${'x'.repeat(500)}`);
  const scanPayload = buildScanRecordPayload({
    ownerId: 'user_abc_123',
    report: {
      objectName: 'Q'.repeat(400),
      category: 'C'.repeat(200),
      explanation: 'E'.repeat(5000),
      characteristics: oversizedList,
      usefulFacts: oversizedList,
      confidenceLevel: 'high',
      confidenceExplanation: 'N'.repeat(3000),
    },
    language: 'en',
    modelName: 'gemini-2.5-flash',
    sourceLabel: 'camera',
    timestamp: sentinelTs,
  });

  assert.deepEqual(Object.keys(scanPayload).sort(), [...blueprint.entities.ScanRecord.required].sort());
  assert.equal(scanPayload.objectName.length, FIREBASE_SCHEMA_LIMITS.objectNameMaxLength);
  assert.equal(scanPayload.category.length, FIREBASE_SCHEMA_LIMITS.categoryMaxLength);
  assert.equal(scanPayload.explanation.length, FIREBASE_SCHEMA_LIMITS.explanationMaxLength);
  assert.equal(scanPayload.confidenceExplanation.length, FIREBASE_SCHEMA_LIMITS.confidenceExplanationMaxLength);
  assert.equal(scanPayload.characteristics.length, FIREBASE_SCHEMA_LIMITS.listMaxItems);
  assert.equal(scanPayload.usefulFacts.length, FIREBASE_SCHEMA_LIMITS.listMaxItems);
  for (const item of scanPayload.characteristics) {
    assert.ok(item.length <= FIREBASE_SCHEMA_LIMITS.listItemMaxLength);
  }

  // 4. TranslationRecord clamps overflow text and includes exact blueprint keys
  const trPayload = buildTranslationRecordPayload({
    ownerId: 'user_abc_123',
    record: {
      mode: 'text',
      sourceLanguageCode: 'en',
      sourceLanguageName: 'English',
      targetLanguageCode: 'hi',
      targetLanguageName: 'Hindi',
      sourceText: 'S'.repeat(9000),
      translatedText: 'T'.repeat(12000),
    },
    timestamp: sentinelTs,
  });
  assert.deepEqual(Object.keys(trPayload).sort(), [...blueprint.entities.TranslationRecord.required].sort());
  assert.equal(trPayload.sourceText.length, FIREBASE_SCHEMA_LIMITS.sourceTextMaxLength);
  assert.equal(trPayload.translatedText.length, FIREBASE_SCHEMA_LIMITS.translatedTextMaxLength);

  // 5. ID poisoning protection
  const poisonedId = '../users/other/scans/' + 'x'.repeat(300) + ' !@#$%';
  const safeId = sanitizeFirestoreDocId(poisonedId, 'scan');
  assert.ok(safeId.length >= 1 && safeId.length <= FIREBASE_SCHEMA_LIMITS.idMaxLength);
  assert.match(safeId, FIREBASE_SCHEMA_LIMITS.idPattern);
});

test('Firestore document mappers safely deserialize Timestamp objects into LocalScanHistoryItem and LocalTranslationRecord', () => {
  const fakeTimestamp = { toMillis: () => 1760000000000 };

  const scan = mapFirestoreScanDoc('scan_1', {
    objectName: 'Lotus Temple',
    category: 'Landmark',
    explanation: 'A Bahai House of Worship in New Delhi.',
    characteristics: ['White marble petals'],
    usefulFacts: ['Completed in 1986'],
    confidenceLevel: 'high',
    confidenceExplanation: 'Distinctive architecture clearly visible.',
    language: 'en',
    modelName: 'gemini-2.5-flash',
    sourceLabel: 'gallery',
    createdAt: fakeTimestamp,
  });
  assert.equal(scan.id, 'scan_1');
  assert.equal(scan.report.objectName, 'Lotus Temple');
  assert.equal(scan.timestamp, 1760000000000);
  assert.equal(scan.thumbnailDataUrl, undefined);

  const tr = mapFirestoreTranslationDoc('tr_1', {
    mode: 'text',
    sourceLanguageCode: 'en',
    sourceLanguageName: 'English',
    targetLanguageCode: 'hi',
    targetLanguageName: 'Hindi',
    sourceText: 'Hello World',
    translatedText: 'नमस्ते दुनिया',
    createdAt: fakeTimestamp,
  });
  assert.equal(tr.id, 'tr_1');
  assert.equal(tr.translatedText, 'नमस्ते दुनिया');
  assert.equal(tr.timestamp, 1760000000000);
});
