import dayjs from "dayjs";
import weekOfYear from "dayjs/plugin/weekOfYear";
import { db } from "../db";
import { goals, goalsCompletions } from "../db/schema";
import { and, count, eq, gte, lte, sql } from "drizzle-orm";

dayjs.extend(weekOfYear);

export async function getWeekPendingGoals() {
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

	const goalsCompletionCounts = db.$with("goal_completion_counts").as(
		db
			.select({
				goalId: goalsCompletions.goalsId,
				completionCount: count(goalsCompletions.id).as("completionCount"),
			})
			.from(goalsCompletions)
			.where(
				and(
					gte(goalsCompletions.createdAt, firstDayOfWeek),
					lte(goalsCompletions.createdAt, lastDayOfWeek),
				),
			)
			.groupBy(goalsCompletions.goalsId),
	);

	const pendingGoals = await db
		.with(goalCreateUpToWeek, goalsCompletionCounts)
		.select({
			id: goalCreateUpToWeek.id,
			title: goalCreateUpToWeek.title,
			desiredWeeklyFrequency: goalCreateUpToWeek.desiredWeeklyFrequency,
			completionCount: sql`
            COALESCE(${goalsCompletionCounts.completionCount}, 0)
        
        `.mapWith(Number),
		})
		.from(goalCreateUpToWeek)
		.leftJoin(
			goalsCompletionCounts,
			eq(goalsCompletionCounts.goalId, goalCreateUpToWeek.id),
		);

	return {
		pendingGoals,
	};
}
