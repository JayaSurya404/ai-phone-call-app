import {
  create,
} from 'zustand';

import type {
  SimulatorScenarioId,
} from '../../api/types';

export const defaultPrompt =
  'Call the customer politely, introduce yourself as the VoiceNexus AI assistant, confirm their appointment, answer simple questions, and end the call respectfully.';

interface OwnerFormState {
  destinationNumber: string;
  promptText: string;
  selectedTemplateId:
    string | null;
  languageCode: string;
  scenarioId:
    SimulatorScenarioId;

  setDestinationNumber(
    value: string
  ): void;

  setPromptText(
    value: string
  ): void;

  selectTemplate(
    id: string | null,
    promptText: string
  ): void;

  setLanguageCode(
    value: string
  ): void;

  setScenarioId(
    value:
      SimulatorScenarioId
  ): void;

  reset(): void;
}

const initialState = {
  destinationNumber: '',
  promptText:
    defaultPrompt,
  selectedTemplateId:
    null,
  languageCode:
    'ta-IN',
  scenarioId:
    'appointment-confirmed' as const,
};

export const useOwnerFormStore =
  create<OwnerFormState>(
    (set) => ({
      ...initialState,

      setDestinationNumber(
        value
      ) {
        set({
          destinationNumber:
            value,
        });
      },

      setPromptText(value) {
        set({
          promptText: value,
        });
      },

      selectTemplate(
        id,
        promptText
      ) {
        set({
          selectedTemplateId:
            id,
          promptText,
        });
      },

      setLanguageCode(value) {
        set({
          languageCode: value,
        });
      },

      setScenarioId(value) {
        set({
          scenarioId: value,
        });
      },

      reset() {
        set(initialState);
      },
    })
  );