import dayjs from 'dayjs';
import { db } from '../db'
import { goals, goalsCompletions } from '../db/schema'
import { and, count,  eq,  gte, lte, sql } from "drizzle-orm";

interface  CreateGoalCompletionRequest {
    goalsId: string

}

export async function createGoalCompletion({
    goalsId,
}: CreateGoalCompletionRequest ) {

    const firstDayOfWeek = dayjs().startOf('week').toDate()
    const lastDayOfWeek = dayjs().endOf('week').toDate()

    const goalsCompletionCounts = db.$with('goal_completion_counts').as(
        db.select({
            goalId: goalsCompletions.goalsId,
            completionCount: count(goalsCompletions.id).as('completionCount') 
        }).from(goalsCompletions).where(and(
            gte(goalsCompletions.createdAt, firstDayOfWeek),
            lte(goalsCompletions.createdAt, lastDayOfWeek),
            eq(goalsCompletions.goalsId, goalsId)
        )).groupBy(goalsCompletions.goalsId)
    )


    const result = await db.with(goalsCompletionCounts).select({
        
        desiredWeeklyFrequency: goals.desiredWeeklyFrequency,
        completionCount: sql`
            COALESCE(${goalsCompletionCounts.completionCount}, 0)
        
        `.mapWith(Number),
    }).from(goals).leftJoin(goalsCompletionCounts, eq(goalsCompletionCounts.goalId, goals.id)).where(eq(goals.id, goalsId)).limit(1)


    const { completionCount, desiredWeeklyFrequency} = result[0]

    if (completionCount >= desiredWeeklyFrequency){
        throw new Error(' Goal already completed this weeek!')
    }

    const insertResult = await db.insert(goalsCompletions).values({ goalsId }).returning()
    const goalsCompletion = insertResult[0]

    return {
        goalsCompletion
    } 
}

