import { and, desc, eq, like, or } from 'drizzle-orm'
import { createError } from 'h3'
import { db } from '@/src/index'
import { notesTable, noteTitleSchema, noteTextSchema } from '@/src/db/schema'

export type Note = typeof notesTable.$inferSelect

const DEFAULT_TITLE = 'Untitled note'

function excerpt(text: string | null, length = 140): string {
  if (!text) return ''
  const normalized = text.replace(/\s+/g, ' ').trim()
  return normalized.length > length ? `${normalized.slice(0, length)}…` : normalized
}

/** All notes for a user, newest first. */
export function listNotes(userId: number): Promise<Note[]> {
  return db
    .select()
    .from(notesTable)
    .where(eq(notesTable.userId, userId))
    .orderBy(desc(notesTable.updatedAt))
}

/** Notes whose title or text contains the query (case-insensitive), newest first. */
export function searchNotes(userId: number, query: string): Promise<Note[]> {
  const term = `%${query.trim()}%`
  return db
    .select()
    .from(notesTable)
    .where(
      and(
        eq(notesTable.userId, userId),
        or(like(notesTable.title, term), like(notesTable.text, term)),
      ),
    )
    .orderBy(desc(notesTable.updatedAt))
}

/** A single note scoped to the owner, or null when missing / not owned. */
export async function getNote(userId: number, noteId: number): Promise<Note | null> {
  if (!Number.isInteger(noteId)) return null
  const note = (
    await db
      .select()
      .from(notesTable)
      .where(and(eq(notesTable.id, noteId), eq(notesTable.userId, userId)))
  )[0]
  return note ?? null
}

/** Same as getNote but throws a 404 when the note is absent. */
export async function getNoteOrThrow(userId: number, noteId: number): Promise<Note> {
  const note = await getNote(userId, noteId)
  if (!note) {
    throw createError({ statusCode: 404, message: 'Note does not exist.' })
  }
  return note
}

export async function createNote(
  userId: number,
  input: { title?: string, text?: string } = {},
): Promise<Note> {
  const title = input.title === undefined ? DEFAULT_TITLE : noteTitleSchema.parse(input.title)
  const text = input.text === undefined ? '' : noteTextSchema.parse(input.text)

  const newNoteId = (
    await db.insert(notesTable).values({ title, text, userId }).$returningId()
  )[0].id

  return getNoteOrThrow(userId, newNoteId)
}

export async function updateNote(
  userId: number,
  noteId: number,
  input: { title?: string, text?: string },
): Promise<Note> {
  await getNoteOrThrow(userId, noteId)

  const patch: { title?: string, text?: string } = {}
  if (input.title !== undefined) patch.title = noteTitleSchema.parse(input.title)
  if (input.text !== undefined) patch.text = noteTextSchema.parse(input.text)

  if (Object.keys(patch).length === 0) {
    throw createError({ statusCode: 400, message: 'Provide a title or text to update' })
  }

  await db
    .update(notesTable)
    .set(patch)
    .where(and(eq(notesTable.id, noteId), eq(notesTable.userId, userId)))

  return getNoteOrThrow(userId, noteId)
}

export async function deleteNote(userId: number, noteId: number): Promise<void> {
  await getNoteOrThrow(userId, noteId)
  await db
    .delete(notesTable)
    .where(and(eq(notesTable.id, noteId), eq(notesTable.userId, userId)))
}

/** Lightweight shape handed to the AI so prompts stay small. */
export interface NoteSummary {
  id: number
  title: string
  excerpt: string
  updatedAt: string
}

export function toNoteSummary(note: Note): NoteSummary {
  return {
    id: note.id,
    title: note.title,
    excerpt: excerpt(note.text),
    updatedAt: new Date(note.updatedAt).toISOString(),
  }
}
