import { createTool } from "@mastra/core/tools";
import { tavily } from "@tavily/core";
import { z } from "zod";

const inputWebFetchSchema = z.object({
	urls: z
		.array(z.httpUrl())
		.min(1)
		.max(5)
		.describe(
			"HTTP(S) URLs to fetch content from (1-5 URLs). Multiple URLs can be processed simultaneously. Best used with direct article or documentation URLs rather than homepages.",
		),
});

const outputWebFetchSchema = z
	.object({
		results: z.array(
			z.object({
				// The URL of the fetched content
				url: z.httpUrl(),
				// The extracted content from the web page
				content: z.string(),
			}),
		),
		errors: z.array(
			z.object({
				// The URL that failed to fetch
				url: z.httpUrl(),
				// The error message or reason for the failure
				error: z.string(),
			}),
		),
	})
	.or(
		z.object({
			error: z.string(),
		}),
	);

export const WebFetchTool = createTool({
	id: "web_fetch",
	description:
		"Fetch complete content from web pages in a clean, readable format. " +
		"Extracts the full main content from web pages, filtering out irrelevant elements like ads and pagination as much as possible, though some noise may remain. " +
		"Use this tool when you need full page content, not just excerpts. " +
		"Returns successfully fetched content separately from any failed URLs.",
	inputSchema: inputWebFetchSchema,
	outputSchema: outputWebFetchSchema,
	execute: async ({ context, mastra }) => {
		const logger = mastra?.getLogger();

		try {
			if (!process.env.TAVILY_API_KEY) {
				const errorMsg = "Error: Missing the 'TAVILY_API_KEY' environment variable prevents web fetching";
				logger?.error("WebFetchTool Error:", errorMsg);
				throw new Error(errorMsg);
			}

			const client = tavily({ apiKey: process.env.TAVILY_API_KEY });

			logger?.info(`WebFetchTool: Fetching content from ${context.urls.length} URLs`);

			const { results, failedResults } = await client.extract(context.urls, {
				format: "markdown",
				extractDepth: "advanced",
			});

			const resultsPart = results.map((result) => {
				return {
					url: result.url,
					content: result.rawContent,
				};
			});

			const errorsPart = failedResults.map((result) => {
				return {
					url: result.url,
					error: result.error,
				};
			});

			logger?.info(`WebFetchTool: Successfully fetched ${resultsPart.length} URLs, ${errorsPart.length} failed`);

			return { results: resultsPart, errors: errorsPart };
		} catch (error) {
			logger?.error("WebFetchTool Error:", error);

			if (error instanceof Error) {
				return { error: error.message };
			}

			return { error: "An unexpected error occurred during web fetch" };
		}
	},
});
