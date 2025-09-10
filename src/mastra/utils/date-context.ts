/**
 * Generate temporal context for LLM system prompts
 * Returns a formatted string with current date and timezone information
 */
export function getDateContext(): string {
	const now = new Date();
	const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";
	// Format local date in the resolved timezone; en-CA -> YYYY-MM-DD
	const localDate = now.toLocaleDateString("en-CA", { timeZone });
	return `
<temporal_context>
Current Date: ${localDate}
Timezone: ${timeZone}
</temporal_context>`;
}
