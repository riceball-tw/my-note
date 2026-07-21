import type { UIMessage } from 'ai'
import { createUIMessageStream, createUIMessageStreamResponse } from 'ai'
import { getUserId } from '@/server/utils/auth'
import { runNoteAssistant, SYSTEM_PROMPT, uiMessagesToChatMessages } from '@/server/utils/chatAgent'
import { createNoteTools } from '@/server/utils/noteTools'
import { createOllamaModel } from '@/server/utils/ollamaModel'

// POST /api/chat — authenticated streaming chat. Runs the LangChain/Ollama
// note assistant and streams an AI SDK UI-message stream back to useChat.
export default defineEventHandler(async (event) => {
  const userId = getUserId(event)
  const body = await readBody<{ messages?: UIMessage[] }>(event)
  const history = uiMessagesToChatMessages(body?.messages ?? [])
  const config = useRuntimeConfig()

  const stream = createUIMessageStream<UIMessage>({
    execute: async ({ writer }) => {
      const tools = createNoteTools(userId, writer)
      const model = createOllamaModel(
        { baseUrl: config.ollamaBaseUrl, model: config.ollamaModel },
        tools,
      )
      await runNoteAssistant({
        model,
        tools,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...history],
        writer,
      })
    },
    onError: (error) => {
      console.error('Chat error:', error)
      const message = error instanceof Error ? error.message : ''
      if (/fetch failed|ECONNREFUSED|ollama|network/i.test(message)) {
        return 'The AI assistant is unavailable. Make sure Ollama is running and the model is pulled.'
      }
      return 'Something went wrong while generating a response.'
    },
  })

  return createUIMessageStreamResponse({ stream })
})
