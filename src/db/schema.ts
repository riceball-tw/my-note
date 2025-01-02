import { mysqlTable, serial, varchar } from 'drizzle-orm/mysql-core';
import { createInsertSchema } from 'drizzle-zod';

export const usersTable = mysqlTable('user', {
  id: serial().primaryKey(),
  email: varchar({ length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  salt: varchar({length: 255}).notNull()
});

// drizzle-zod: https://github.com/drizzle-team/drizzle-orm/blob/main/drizzle-zod/README.md
const usersInsertSchema = createInsertSchema(usersTable, {
  email: (schema) => schema.email(),
  password: (schema) => schema.min(8)
});
export const usersInsertRequestSchema = usersInsertSchema.pick({email: true, password: true})