import { getCurrentDateTimeZone } from "./date";

/**
 * Return a small XML-like snippet containing environment details.
 *
 * This function obtains the current local date/time (including timezone)
 * and formats it into a simple <environment_details> block suitable for
 * embedding in generated documentation or logs.
 *
 * @returns A string containing the environment details in XML-like format.
 */
export function getEnvironmentDetails(): string {
	const localTime = getCurrentDateTimeZone();

	return `<environment_details>\n# Current Time\n${localTime}\n</environment_details>`;
}

/**
 * Wrap the given message in a simple XML-like <message> block and
 * append the current environment details.
 *
 * This is useful for producing messages that include the original content
 * alongside timestamp/timezone context for logging or documentation.
 *
 * @param message - The main message content to wrap.
 * @returns A combined string containing the message and environment details.
 */
export function wrapMessage(message: string): string {
	const query = `<message>\n${message}\n</message>`;
	const environmentDetails = getEnvironmentDetails();
	return `${query}\n\n${environmentDetails}`;
}
