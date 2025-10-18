import type { Queue } from "bullmq";

export const safeObliterateQueue = async (queue: Queue): Promise<boolean> => {
	const { active } = await queue.getJobCounts();

	if (active > 0) {
		return false;
	}

	try {
		await queue.obliterate({ force: true });
		return true;
	} catch (error) {
		console.error(
			`[safeObliterateQueue] Failed to obliterate queue "${queue.name}":`,
			error,
		);
		return false;
	}
};
