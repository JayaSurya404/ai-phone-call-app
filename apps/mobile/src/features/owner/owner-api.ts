import {
  apiRequest,
} from '../../api/client';

import type {
  ApiListResponse,
  CallSession,
  CallSessionListItem,
  PromptTemplate,
  SimulatorScenarioId,
} from '../../api/types';

export interface CreateCallInput {
  destinationNumber: string;
  promptTemplateId:
    string | null;
  promptText: string;
  languageCode: string;
}

export async function listPromptTemplates():
Promise<PromptTemplate[]> {
  const response =
    await apiRequest<
      ApiListResponse<
        PromptTemplate
      >
    >(
      '/api/v1/prompt-templates'
    );

  return response.items;
}

export async function listRecentCalls():
Promise<CallSessionListItem[]> {
  const response =
    await apiRequest<
      ApiListResponse<
        CallSessionListItem
      >
    >(
      '/api/v1/calls?limit=12'
    );

  return response.items;
}

export function createCall(
  input: CreateCallInput
): Promise<CallSession> {
  return apiRequest<
    CallSession
  >(
    '/api/v1/calls',

    {
      method: 'POST',

      body: {
        destinationNumber:
          input
            .destinationNumber,

        promptTemplateId:
          input
            .promptTemplateId,

        promptText:
          input.promptText,

        languageCode:
          input.languageCode,
      },
    }
  );
}

export function startCall(
  callSessionId: string,
  scenarioId:
    SimulatorScenarioId
): Promise<CallSession> {
  return apiRequest<
    CallSession
  >(
    `/api/v1/calls/${callSessionId}/start`,

    {
      method: 'POST',

      body: {
        scenarioId,
      },
    }
  );
}