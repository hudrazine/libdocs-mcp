import { createOpenRouter } from "@openrouter/ai-sdk-provider";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
if (!OPENROUTER_API_KEY) {
	throw new Error("Error: Missing OPENROUTER_API_KEY in environment variables");
}

export const openrouter = createOpenRouter({
	apiKey: OPENROUTER_API_KEY,
	headers: {
		"HTTP-Referer": "https://github.com/hudrazine/libdocs-mcp",
		"X-Title": "LibDocs MCP",
	},
});
