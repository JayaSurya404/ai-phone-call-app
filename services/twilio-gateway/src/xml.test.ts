import assert
  from 'node:assert/strict';

import test
  from 'node:test';

import {
  buildConversationRelayTwiml,
} from './xml.js';

const baseOptions = {
  webSocketUrl:
    'wss://example.test/twilio/conversation',

  callSessionId:
    'call-session-1',

  welcomeGreeting:
    'Hello from VoiceNexus.',

  actionUrl:
    'https://example.test/twilio/connect-action',

  englishVoice:
    'unused-English-voice',

  tamilVoice:
    'unused-Tamil-voice',

  hindiVoice:
    'unused-Hindi-voice',
};

test(
  'Tamil mode uses fixed Tamil Nova-3 STT and multilingual TTS',
  () => {
    const twiml =
      buildConversationRelayTwiml({
        ...baseOptions,
        languageMode:
          'ta-IN',
      });

    assert.match(
      twiml,
      /transcriptionLanguage="ta"/
    );

    assert.match(
      twiml,
      /ttsLanguage="multi"/
    );

    assert.match(
      twiml,
      /speechModel="nova-3-general"/
    );

    assert.doesNotMatch(
      twiml,
      /speechModel="flux"/
    );

    assert.doesNotMatch(
      twiml,
      /<Language /
    );
  }
);

test(
  'automatic mode uses Flux only for English and Hindi hints',
  () => {
    const twiml =
      buildConversationRelayTwiml({
        ...baseOptions,
        languageMode:
          'multi',
      });

    assert.match(
      twiml,
      /transcriptionLanguage="multi"/
    );

    assert.match(
      twiml,
      /speechModel="flux"/
    );

    assert.match(
      twiml,
      /<Language code="en" \/>/
    );

    assert.match(
      twiml,
      /<Language code="hi" \/>/
    );

    assert.doesNotMatch(
      twiml,
      /Language code="ta/
    );
  }
);

test(
  'dynamic values are XML escaped',
  () => {
    const twiml =
      buildConversationRelayTwiml({
        ...baseOptions,

        languageMode:
          'ta-IN',

        welcomeGreeting:
          'à®µà®£à®•à¯à®•à®®à¯ & welcome',
      });

    assert.match(
      twiml,
      /à®µà®£à®•à¯à®•à®®à¯ &amp; welcome/
    );
  }
);