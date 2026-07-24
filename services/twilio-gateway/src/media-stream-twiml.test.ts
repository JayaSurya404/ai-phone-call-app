import assert
  from 'node:assert/strict';

import test
  from 'node:test';

import {
  buildMediaStreamTwiml,
} from './media-stream-twiml.js';

test(
  'creates bidirectional Twilio Media Stream TwiML',
  () => {
    const twiml =
      buildMediaStreamTwiml({
        webSocketUrl:
          'wss://example.test/twilio/media',

        callSessionId:
          'call-1',

        languageProfileId:
          'ta-en',
      });

    assert.match(
      twiml,
      /<Connect>/
    );

    assert.match(
      twiml,
      /<Stream url="wss:\/\/example\.test\/twilio\/media">/
    );

    assert.match(
      twiml,
      /name="callSessionId" value="call-1"/
    );

    assert.match(
      twiml,
      /name="languageProfileId" value="ta-en"/
    );

    assert.doesNotMatch(
      twiml,
      /ConversationRelay/
    );
  }
);

test(
  'escapes custom parameter values',
  () => {
    const twiml =
      buildMediaStreamTwiml({
        webSocketUrl:
          'wss://example.test/media?x=1&y=2',

        callSessionId:
          'a&b',

        languageProfileId:
          'ta-en',
      });

    assert.match(
      twiml,
      /x=1&amp;y=2/
    );

    assert.match(
      twiml,
      /a&amp;b/
    );
  }
);