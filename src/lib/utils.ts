export function getWeekNumber(date: Date): number {
	const firstThursday = new Date(date.getFullYear(), 0, 4);
	const firstThursdayTime = firstThursday.getTime();
	const targetTime = date.getTime();

	// Find the Thursday of the current week
	const dayOfWeek = (date.getDay() + 6) % 7; // Make Monday=0, Sunday=6
	const thursdayThisWeek = new Date(
		targetTime - dayOfWeek * 86400000 + 3 * 86400000,
	);

	// Calculate week number
	const weekNumber =
		Math.round(
			(thursdayThisWeek.getTime() - firstThursdayTime) / (7 * 86400000),
		) + 1;

	return weekNumber;
}
