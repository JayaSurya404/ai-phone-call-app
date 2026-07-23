import assert from 'node:assert/strict';
import test from 'node:test';

import {
  explicitLanguageRequest,
  resolveCallerLanguage,
  responseLanguage,
} from './language.js';

test('Tamil script wins over an incorrect Spanish tag', () => {
  const result = resolveCallerLanguage(
    'எனக்கு தமிழ் தெரியும்',
    'es',
    'en-IN',
  );

  assert.equal(result.language, 'ta-IN');
  assert.equal(result.unexpectedDetection, false);
});

test('unexpected language tag does not cause a Spanish reply', () => {
  const result = resolveCallerLanguage(
    'Entiendo gracias',
    'es',
    'en-IN',
  );

  assert.equal(result.language, 'en-IN');
  assert.equal(result.unexpectedDetection, true);
});

test('explicit Tamil request locks Tamil', () => {
  assert.equal(explicitLanguageRequest('Please speak Tamil'), 'ta-IN');
});

test('Tamil response text selects Tamil TTS', () => {
  assert.equal(responseLanguage('நிச்சயமாக பேசலாம்', 'en-IN'), 'ta-IN');
});
