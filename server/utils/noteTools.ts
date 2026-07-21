import type { UIMessage, UIMessageStreamWriter } from 'ai'
import { z } from 'zod'
import type { ToolMap } from './chatAgent'
import { signPendingDelete } from './deleteToken'
import {
  createNote,
  getNote,
  listNotes,
  searchNotes,
  toNoteSummary,
  updateNote,
} from './notes'
import { noteTextSchema, noteTitleSchema } from '@/src/db/schema'

/**
 * Build the note tools for a single request, bound to the authenticated user
 * and the stream writer (so mutations can push UI signals). Every tool is
 * scoped to `userId`; there is no way for the model to reach another user.
 */
export function createNoteTools(
  userId: number,
  writer: UIMessageStreamWriter<UIMessage>,
): ToolMap {
  const notesChanged = (action: string) => {
    writer.write({ type: 'data-notes-changed', data: { action }, transient: true })
  }

  return {
    list_notes: {
      description: 'List the signed-in user\'s notes (id, title, excerpt). Use before updating or deleting when the user is vague.',
      schema: z.object({}),
      run: async () => {
        const notes = await listNotes(userId)
        return JSON.stringify(notes.map(toNoteSummary))
      },
    },

    search_notes: {
      description: 'Search the user\'s notes by keyword across title and text. Returns matching notes (id, title, excerpt).',
      schema: z.object({ query: z.string().min(1).describe('Keyword or phrase to search for') }),
      run: async (args) => {
        const { query } = z.object({ query: z.string().min(1) }).parse(args)
        const notes = await searchNotes(userId, query)
        if (notes.length === 0) return `No notes match "${query}".`
        const matches = notes.map(toNoteSummary)
        if (matches.length > 1) {
          return JSON.stringify({
            ambiguous: true,
            message: 'Multiple notes match. Ask the user which one they mean before acting.',
            matches,
          })
        }
        return JSON.stringify({ ambiguous: false, matches })
      },
    },

    read_note: {
      description: 'Read the full content of one note by its id.',
      schema: z.object({ id: z.number().int().describe('The note id') }),
      run: async (args) => {
        const { id } = z.object({ id: z.coerce.number().int() }).parse(args)
        const note = await getNote(userId, id)
        if (!note) return `No note with id ${id} exists for this user.`
        return JSON.stringify({ id: note.id, title: note.title, text: note.text ?? '' })
      },
    },

    create_note: {
      description: 'Create a new note. Title and text are optional; defaults to an empty "Untitled note".',
      schema: z.object({
        title: noteTitleSchema.optional().describe('Title of the new note'),
        text: noteTextSchema.optional().describe('Body text of the new note'),
      }),
      run: async (args) => {
        const input = z
          .object({ title: noteTitleSchema.optional(), text: noteTextSchema.optional() })
          .parse(args)
        const note = await createNote(userId, input)
        notesChanged('create')
        return JSON.stringify({ created: true, note: toNoteSummary(note) })
      },
    },

    update_note: {
      description: 'Update the title and/or text of a single note identified by its exact id.',
      schema: z.object({
        id: z.number().int().describe('The note id to update'),
        title: noteTitleSchema.optional().describe('New title'),
        text: noteTextSchema.optional().describe('New body text'),
      }),
      run: async (args) => {
        const { id, title, text } = z
          .object({
            id: z.coerce.number().int(),
            title: noteTitleSchema.optional(),
            text: noteTextSchema.optional(),
          })
          .parse(args)
        if (title === undefined && text === undefined) {
          return 'Nothing to update: provide a new title or text.'
        }
        const note = await updateNote(userId, id, { title, text })
        notesChanged('update')
        return JSON.stringify({ updated: true, note: toNoteSummary(note) })
      },
    },

    request_delete_note: {
      description: 'Start deletion of one note by its exact id. This does NOT delete; it asks the user to confirm in the UI.',
      schema: z.object({ id: z.number().int().describe('The note id to delete') }),
      run: async (args) => {
        const { id } = z.object({ id: z.coerce.number().int() }).parse(args)
        const note = await getNote(userId, id)
        if (!note) return `No note with id ${id} exists for this user.`
        const token = signPendingDelete(userId, note.id)
        writer.write({
          type: 'data-pending-delete',
          id: `pending-delete-${note.id}`,
          data: { token, noteId: note.id, title: note.title },
        })
        return JSON.stringify({
          awaitingConfirmation: true,
          message: `Asked the user to confirm deleting "${note.title}".`,
        })
      },
    },
  }
}
