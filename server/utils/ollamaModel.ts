import type { AIMessageChunk, MessageContent } from '@langchain/core/messages'
import { AIMessage, HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages'
import { tool } from '@langchain/core/tools'
import { ChatOllama } from '@langchain/ollama'
import type { AssistantModel, ChatMessage, ToolMap } from './chatAgent'

function extractText(content: MessageContent | undefined): string {
  if (!content) return ''
  if (typeof content === 'string') return content
  return content
    .map(part => (part.type === 'text' ? part.text : ''))
    .join('')
}

function toLangChainMessage(message: ChatMessage) {
  switch (message.role) {
    case 'system':
      return new SystemMessage(message.content)
    case 'user':
      return new HumanMessage(message.content)
    case 'assistant':
      return new AIMessage({
        content: message.content,
        tool_calls: (message.toolCalls ?? []).map(call => ({
          id: call.id,
          name: call.name,
          args: call.args,
          type: 'tool_call' as const,
        })),
      })
    case 'tool':
      return new ToolMessage({ content: message.content, tool_call_id: message.toolCallId ?? '' })
  }
}

/**
 * Build an AssistantModel backed by a local Ollama model. Tool schemas are
 * bound to the model so it can decide when to call them; the actual execution
 * happens in the orchestrator against the same ToolMap.
 */
export function createOllamaModel(config: { baseUrl: string, model: string }, tools: ToolMap): AssistantModel {
  const chat = new ChatOllama({
    baseUrl: config.baseUrl,
    model: config.model,
    temperature: 0,
  })

  const boundTools = Object.entries(tools).map(([name, definition]) =>
    tool(async () => '', {
      name,
      description: definition.description,
      schema: definition.schema,
    }),
  )

  const bound = chat.bindTools(boundTools)

  return {
    async streamStep(messages, { onText, signal }) {
      const lcMessages = messages.map(toLangChainMessage)
      const stream = await bound.stream(lcMessages, { signal })

      let aggregate: AIMessageChunk | undefined
      for await (const chunk of stream) {
        const text = extractText(chunk.content)
        if (text) onText(text)
        aggregate = aggregate === undefined ? chunk : aggregate.concat(chunk)
      }

      const toolCalls = (aggregate?.tool_calls ?? []).map((call, index) => ({
        id: call.id ?? `call_${index}`,
        name: call.name,
        args: (call.args ?? {}) as Record<string, unknown>,
      }))

      return { content: extractText(aggregate?.content), toolCalls }
    },
  }
}
