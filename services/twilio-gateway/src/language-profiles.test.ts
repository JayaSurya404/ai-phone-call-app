import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getLanguageProfile,
  languageProfiles,
} from './language-profiles.js';

test(
  'registry contains at least twenty profiles',
  () => {
    assert.ok(languageProfiles.length >= 20);
  }
);

test(
  'profile identifiers are unique',
  () => {
    const ids = languageProfiles.map(
      (profile) => profile.id
    );

    assert.equal(
      new Set(ids).size,
      ids.length
    );
  }
);

test(
  'Tamil profile focuses STT on Tamil and English',
  () => {
    const tamil = getLanguageProfile('ta-en');

    assert.equal(tamil.sttPrimaryLanguage, 'ta');
    assert.deepEqual(
      tamil.sttSecondaryLanguages,
      ['en']
    );
  }
);

test(
  'English profile does not add duplicate secondary language',
  () => {
    assert.deepEqual(
      getLanguageProfile('en-in')
        .sttSecondaryLanguages,
      []
    );
  }
);

test(
  'legacy profile identifiers resolve correctly',
  () => {
    assert.equal(
      getLanguageProfile('ta-IN').id,
      'ta-en'
    );

    assert.equal(
      getLanguageProfile('hi-IN').id,
      'hi-en'
    );
  }
);

test(
  'Tamil uses multilingual v2 for higher quality',
  () => {
    assert.equal(
      getLanguageProfile('ta-en').ttsModel,
      'eleven_multilingual_v2'
    );
  }
);

test(
  'native language labels remain valid Unicode',
  () => {
    assert.equal(
      getLanguageProfile('ta-en').nativeName,
      'தமிழ் + English'
    );

    assert.equal(
      getLanguageProfile('ja-en').nativeName,
      '日本語 + English'
    );
  }
);
