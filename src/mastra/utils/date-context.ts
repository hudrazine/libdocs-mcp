/**
 * Generate temporal context for LLM system prompts
 * Returns a formatted string with current date and timezone information
 */
export function getDateContext(): string {
	const now = new Date();
	const dateContext = `

<temporal_context>
Current Date: ${now.toISOString().split("T")[0]}
Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}
</temporal_context>`;

	return dateContext;
}
