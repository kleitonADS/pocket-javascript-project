import { Plus } from "lucide-react";
import { OutlineButton } from "./ui/outline-button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPendingGoals } from "../http/get-pending-goals";
import { createGoalCompletion } from "../http/create-goal-completion";

export function PendingGoals() {
	const queryClient = useQueryClient();

	const { data } = useQuery({
		queryKey: ["pending-goals"],
		queryFn: getPendingGoals,
		staleTime: 1000 * 60,
	});

	if (!data) {
		null;
	}

	async function handdleCompleteGoals(goalsId: string) {
		await createGoalCompletion(goalsId);

		queryClient.invalidateQueries({ queryKey: ["summary"] });
		queryClient.invalidateQueries({ queryKey: ["pending-goals"] });
	}

	return (
		<div className="fle flex-wrap gap-3">
			{data?.map((goal) => {
				return (
					<OutlineButton
						key={goal.id}
						disabled={goal.completionCount >= goal.desiredWeeklyFrequency}
						onClick={() => handdleCompleteGoals(goal.id)}
					>
						<Plus className="size-4 text-zinc-600 " />
						{goal.title}
					</OutlineButton>
				);
			})}
		</div>
	);
}
