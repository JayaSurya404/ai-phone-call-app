import assert
  from 'node:assert/strict';

import test
  from 'node:test';

import {
  buildRealtimeSttUrl,
} from './elevenlabs-stt.js';

import {
  getLanguageProfile,
} from './language-profiles.js';

test(
  'Tamil profile focuses STT on Tamil and English',
  () => {
    const url =
      new URL(
        buildRealtimeSttUrl({
          modelId:
            'scribe_v2_realtime',

          profile:
            getLanguageProfile(
              'ta-en'
            ),
        })
      );

    assert.equal(
      url.searchParams.get(
        'audio_format'
      ),
      'ulaw_8000'
    );

    assert.equal(
      url.searchParams.get(
        'language_code'
      ),
      'ta'
    );

    assert.deepEqual(
      url.searchParams.getAll(
        'secondary_languages'
      ),
      ['en']
    );

    assert.equal(
      url.searchParams.get(
        'commit_strategy'
      ),
      'vad'
    );
  }
);

test(
  'English profile does not add a duplicate secondary language',
  () => {
    const url =
      new URL(
        buildRealtimeSttUrl({
          modelId:
            'scribe_v2_realtime',

          profile:
            getLanguageProfile(
              'en-in'
            ),
        })
      );

    assert.deepEqual(
      url.searchParams.getAll(
        'secondary_languages'
      ),
      []
    );
  }
);