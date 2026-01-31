import { useMutation } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { AiAnalysisRequest, AiAnalysisResponse } from '../types/ai'

export function useAiAnalysis(clientId: string) {
  return useMutation({
    mutationFn: async (request: AiAnalysisRequest): Promise<AiAnalysisResponse> => {
      const { data } = await api.post<AiAnalysisResponse>(
        `/api/ai/${clientId}/analyze`,
        request
      )
      return data
    },
  })
}
