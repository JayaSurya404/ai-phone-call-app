import {
  createHttpTelephonyClient,
} from './http-telephony-client.js';

import {
  createTelephonySimulatorClient,
} from './telephony-simulator-client.js';

import type {
  HttpTelephonyClientOptions,
} from './http-telephony-client.js';

import type {
  TelephonySimulatorClient,
  TelephonySimulatorClientOptions,
} from './telephony-simulator-client.js';

export interface TelephonyClientFactoryOptions {
  mode:
    | 'simulator'
    | 'http';

  simulator:
    TelephonySimulatorClientOptions;

  http:
    HttpTelephonyClientOptions;
}

export function createTelephonyClient(
  options:
    TelephonyClientFactoryOptions
): TelephonySimulatorClient {
  return options.mode ===
    'http'
    ? createHttpTelephonyClient(
        options.http
      )
    : createTelephonySimulatorClient(
        options.simulator
      );
}