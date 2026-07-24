import assert
  from 'node:assert/strict';

import test
  from 'node:test';

import {
  getLanguageProfile,
  languageProfiles,
} from './language-profiles.js';

test(
  'registry contains more than fifteen profiles',
  () => {
    assert.ok(
      languageProfiles.length >=
      20
    );
  }
);

test(
  'profile identifiers are unique',
  () => {
    const ids =
      languageProfiles.map(
        (profile) =>
          profile.id
      );

    assert.equal(
      new Set(ids).size,
      ids.length
    );
  }
);

test(
  'Tamil and Kannada profiles include English as secondary STT',
  () => {
    assert.deepEqual(
      getLanguageProfile(
        'ta-en'
      ).sttSecondaryLanguages,
      ['en']
    );

    assert.deepEqual(
      getLanguageProfile(
        'kn-en'
      ).sttSecondaryLanguages,
      ['en']
    );
  }
);

test(
  'legacy mobile values resolve to new profiles',
  () => {
    assert.equal(
      getLanguageProfile(
        'ta-IN'
      ).id,
      'ta-en'
    );

    assert.equal(
      getLanguageProfile(
        'hi-IN'
      ).id,
      'hi-en'
    );
  }
);