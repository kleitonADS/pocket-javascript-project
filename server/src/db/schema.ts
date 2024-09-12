import { integer } from "drizzle-orm/pg-core";
import { timestamp } from "drizzle-orm/pg-core";
import { text } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2"


export const goals = pgTable('goals', {
    id: text('id').primaryKey().$default(() =>createId()),
    title: text('title').notNull(),
    desiredWeeklyFrequency: integer('desired_weekly_frequency').notNull(),
    createdAt: timestamp('created_at', {withTimezone: true}).notNull().defaultNow(),
})

export const goalsCompletions = pgTable('goal_completions', {
    id:text('id').primaryKey().$default(() =>createId()),
    goalsId: text('goals_id').references(() => goals.id).notNull(),
    createdAt: timestamp('created_at', {withTimezone: true}).notNull().defaultNow(),
})