import type { UIMessage, UIMessageStreamWriter } from 'ai'
import { randomUUID } from 'node:crypto'
import type { z } from 'zod'

export interface ToolCall {
  id: string
  name: string
  args: Record<string, unknown>
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  toolCalls?: ToolCall[]
  toolCallId?: string
}

/**
 * Minimal, framework-agnostic contract the orchestrator drives. The real
 * implementation wraps ChatOllama; tests pass a fake. `streamStep` streams
 * assistant text through `onText` and returns any tool calls it decided on.
 */
export interface AssistantModel {
  streamStep: (
    messages: ChatMessage[],
    opts: { onText: (delta: string) => void, signal?: AbortSignal },
  ) => Promise<{ content: string, toolCalls: ToolCall[] }>
}

export interface AgentTool {
  description: string
  schema: z.ZodTypeAny
  run: (args: unknown) => Promise<string> | string
}

export type ToolMap = Record<string, AgentTool>

export const SYSTEM_PROMPT = `You are the assistant for "MyNote", a personal note-taking app.

You can help with exactly these things:
- Answer questions about how to use MyNote (creating, editing, searching, and deleting notes; signing in and out).
- Search and list the signed-in user's notes (titles and short excerpts).
- Read the full content of one of the user's notes.
- Create a new note.
- Update the title or text of a single, uniquely identified note.
- Start deletion of a single, uniquely identified note (deletion always requires the user to confirm).

Rules you must follow:
- Only ever act on the currently signed-in user's own notes. Never reveal or claim to access anyone else's data.
- To update or delete a note you must know its exact note id. If the user refers to a note by title or description, use the search tool first.
- If a search matches more than one note, do NOT guess. List the matches (title + id) and ask the user which one they mean.
- Never assume the user means the note currently open on screen — you cannot see the screen. Always resolve the target through search or an explicit id.
- Never delete a note directly. Call the delete tool to start a confirmation; the user confirms in the UI.
- If asked to do something MyNote does not support (attachments, sharing, reminders, etc.), say plainly that it is not supported.
- Keep answers short and friendly.`

/**
 * Run the tool-calling loop: stream assistant text, execute any tool calls,
 * feed results back, repeat until the model produces a final answer with no
 * tool calls (or the step budget is exhausted).
 */
export async function runNoteAssistant(options: {
  model: AssistantModel
  tools: ToolMap
  messages: ChatMessage[]
  writer: UIMessageStreamWriter<UIMessage>
  signal?: AbortSignal
  maxSteps?: number
}): Promise<void> {
  const { model, tools, writer, signal, maxSteps = 6 } = options
  const convo: ChatMessage[] = [...options.messages]

  for (let step = 0; step < maxSteps; step++) {
    let textId: string | null = null
    const onText = (delta: string) => {
      if (!delta) return
      if (!textId) {
        textId = randomUUID()
        writer.write({ type: 'text-start', id: textId })
      }
      writer.write({ type: 'text-delta', id: textId, delta })
    }

    const { content, toolCalls } = await model.streamStep(convo, { onText, signal })

    if (textId) writer.write({ type: 'text-end', id: textId })

    if (toolCalls.length === 0) return

    convo.push({ role: 'assistant', content, toolCalls })

    for (const call of toolCalls) {
      writer.write({
        type: 'tool-input-available',
        toolCallId: call.id,
        toolName: call.name,
        input: call.args,
        dynamic: true,
      })

      const tool = tools[call.name]
      if (!tool) {
        const errorText = `Unknown tool: ${call.name}`
        writer.write({ type: 'tool-output-error', toolCallId: call.id, errorText, dynamic: true })
        convo.push({ role: 'tool', toolCallId: call.id, content: errorText })
        continue
      }

      try {
        const output = await tool.run(call.args)
        writer.write({ type: 'tool-output-available', toolCallId: call.id, output, dynamic: true })
        convo.push({ role: 'tool', toolCallId: call.id, content: output })
      } catch (err) {
        const errorText = err instanceof Error ? err.message : 'Tool execution failed'
        writer.write({ type: 'tool-output-error', toolCallId: call.id, errorText, dynamic: true })
        convo.push({ role: 'tool', toolCallId: call.id, content: `Error: ${errorText}` })
      }
    }
  }

  const textId = randomUUID()
  writer.write({ type: 'text-start', id: textId })
  writer.write({
    type: 'text-delta',
    id: textId,
    delta: 'Sorry, I could not complete that request. Please try rephrasing it.',
  })
  writer.write({ type: 'text-end', id: textId })
}

/** Flatten AI SDK UI messages into the plain chat history the agent uses. */
export function uiMessagesToChatMessages(messages: UIMessage[]): ChatMessage[] {
  const result: ChatMessage[] = []
  for (const message of messages) {
    if (message.role !== 'user' && message.role !== 'assistant') continue
    const text = message.parts
      .filter((part): part is { type: 'text', text: string } => part.type === 'text')
      .map(part => part.text)
      .join('')
      .trim()
    if (text) result.push({ role: message.role, content: text })
  }
  return result
}
