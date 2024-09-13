import { and, count, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "../db";
import { goals, goalsCompletions } from "../db/schema";
import dayjs from "dayjs";

export async function getWeekSummary() {
	const firstDayOfWeek = dayjs().startOf("week").toDate();
	const lastDayOfWeek = dayjs().endOf("week").toDate();

	const goalCreateUpToWeek = db.$with("goals_created_up_to_week").as(
		db
			.select({
				id: goals.id,
				title: goals.title,
				desiredWeeklyFrequency: goals.desiredWeeklyFrequency,
				createAt: goals.createdAt,
			})
			.from(goals)
			.where(lte(goals.createdAt, lastDayOfWeek)),
	);

	const goalsCompleteInWeek = db.$with("goal_completed_in_week").as(
		db
			.select({
				id: goals.id,
				title: goals.title,
				completedAt: goalsCompletions.createdAt,
				completedAtDate: sql`DATE(${goalsCompletions.createdAt})`.as(
					"completedAtDate",
				),
			})
			.from(goalsCompletions)
			.innerJoin(goals, eq(goals.id, goalsCompletions.goalsId))
			.where(
				and(
					gte(goalsCompletions.createdAt, firstDayOfWeek),
					lte(goalsCompletions.createdAt, lastDayOfWeek),
				),
			),
	);

	const goalsCompletedByWeekDay = db.$with("goals_completed_by_week_day").as(
		db
			.select({
				completedAtDate: goalsCompleteInWeek.completedAtDate,
				completions: sql`
					JSON_AGG(
						JSON_BUILD_OBJECT(
						 'id', ${goalsCompleteInWeek.id},
						 'title', ${goalsCompleteInWeek.title},
						 'CompletedAt', ${goalsCompleteInWeek.completedAt}

						)
					)`.as("completions"),
			})
			.from(goalsCompleteInWeek)
			.groupBy(goalsCompleteInWeek.completedAtDate),
	);

	const result = await db
		.with(goalCreateUpToWeek, goalsCompleteInWeek, goalsCompletedByWeekDay)
		.select({
			completed: sql`(SELECT COUNT(*) FROM ${goalsCompleteInWeek})`.mapWith(
				Number,
			),

			total:
				sql`(SELECT SUM(${goalCreateUpToWeek.desiredWeeklyFrequency}) FROM ${goalCreateUpToWeek})`.mapWith(
					Number,
				),
			goalsPerDay: sql`
			JSON_OBJECT_AGG(
			${goalsCompletedByWeekDay.completedAtDate},
				${goalsCompletedByWeekDay.completions}
			
			)`,
		})
		.from(goalsCompletedByWeekDay);

	return {
		summary: result,
	};
}
