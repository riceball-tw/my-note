import { mysqlTable, serial, text, varchar, timestamp, int } from 'drizzle-orm/mysql-core';
import { createInsertSchema } from 'drizzle-zod';
import { relations } from 'drizzle-orm';
import { z } from 'zod';

export const usersTable = mysqlTable('users', {
  id: int().autoincrement().primaryKey(),
  email: varchar({ length: 255 }).notNull().unique(),
  password: varchar({ length: 255 }).notNull()
});

export const notesTable = mysqlTable('notes', {
  id: serial().primaryKey(),
  userId: int('user_id').notNull().references(() => usersTable.id),
  title: varchar({ length: 255 }).notNull().default('Untitled note'),
  text: text(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().onUpdateNow().notNull(),
})

export const userRelations = relations(usersTable, ({ many }) => ({
  notes: many(notesTable),
}));

export const noteRelations = relations(notesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [notesTable.userId],
    references: [usersTable.id],
  }),
}));

// drizzle-zod: https://github.com/drizzle-team/drizzle-orm/blob/main/drizzle-zod/README.md
const usersInsertSchema = createInsertSchema(usersTable, {
  email: (schema) => schema.email(),
  password: (schema) => schema.min(8)
});
export const usersInsertRequestSchema = usersInsertSchema.pick({email: true, password: true})

// Note request payloads shared by REST endpoints and AI tools.
export const noteTitleSchema = z.string().trim().min(1, 'Title cannot be empty').max(255, 'Title must be 255 characters or fewer')
export const noteTextSchema = z.string().max(50_000, 'Note is too long')

export const noteCreateRequestSchema = z.object({
  title: noteTitleSchema.optional(),
  text: noteTextSchema.optional(),
})

export const noteUpdateRequestSchema = z.object({
  title: noteTitleSchema.optional(),
  text: noteTextSchema.optional(),
}).refine((data) => data.title !== undefined || data.text !== undefined, {
  message: 'Provide a title or text to update',
})

export type NoteCreateRequest = z.infer<typeof noteCreateRequestSchema>
export type NoteUpdateRequest = z.infer<typeof noteUpdateRequestSchema>