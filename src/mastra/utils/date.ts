/** Return current date/time formatted with timezone, e.g. "YYYY-MM-DDTHH:mm:ss±HH:MM (TimeZone)". */
export function getCurrentDateTimeZone(now: Date = new Date()): string {
	let timeZone = "UTC";
	try {
		timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";
	} catch {
		// Fallback to UTC label if Intl is unavailable or fails
	}
	return `${formatDateTimeWithOffset(now)} (${timeZone})`;
}

/** Format a Date as "YYYY-MM-DDTHH:mm:ss±HH:MM". */
export function formatDateTimeWithOffset(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	const hour = String(date.getHours()).padStart(2, "0");
	const minute = String(date.getMinutes()).padStart(2, "0");
	const second = String(date.getSeconds()).padStart(2, "0");
	const offsetMinutes = -date.getTimezoneOffset(); // getTimezoneOffset uses the opposite sign
	const offsetSign = offsetMinutes >= 0 ? "+" : "-";
	const absOffsetMinutes = Math.abs(offsetMinutes);
	const offsetHours = String(Math.floor(absOffsetMinutes / 60)).padStart(2, "0");
	const offsetMins = String(absOffsetMinutes % 60).padStart(2, "0");
	return `${year}-${month}-${day}T${hour}:${minute}:${second}${offsetSign}${offsetHours}:${offsetMins}`;
}
