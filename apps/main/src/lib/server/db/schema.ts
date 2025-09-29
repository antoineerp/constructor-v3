import { pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';

export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 160 }).notNull(),
  slug: varchar('slug', { length: 180 }).notNull(),
  blueprintJson: text('blueprint_json'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const components = pgTable('components', {
  id: serial('id').primaryKey(),
  projectId: serial('project_id').notNull(),
  filename: varchar('filename', { length: 255 }).notNull(),
  code: text('code').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});
