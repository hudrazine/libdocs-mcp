import { createTool } from "@mastra/core/tools";
import { tavily } from "@tavily/core";
import { z } from "zod";

const inputWebSearchSchema = z.object({
	query: z
		.string()
		.min(2)
		.max(100)
		.describe(
			"The search query or keywords to look up. " +
				"When searching for recent or current information, include the actual current year " +
				"in your query to get the most relevant results (e.g., 'AI developments 2025' instead of 'latest AI developments').",
		),
	maxResults: z.coerce
		.number()
		.int()
		.min(1)
		.max(20)
		.optional()
		.default(() => {
			const n = Number(process.env.LIBDOCS_WEB_SEARCH_LIMIT ?? 10);
			return Number.isFinite(n) && n >= 1 && n <= 20 ? n : 10;
		})
		.describe(
			"Number of search results to return (default: 10). Higher values provide more context, lower values focus on best matches.",
		),
});

const outputWebSearchSchema = z
	.array(
		z.object({
			url: z.url().describe("The URL of the search result."),
			title: z.string().describe("The title of the search result."),
			snippet: z
				.string()
				.describe(
					"A query-relevant excerpt from the web page, not the complete content. For full page content, use the URL with a fetch tool.",
				),
		}),
	)
	.or(
		z.object({
			error: z.string(),
		}),
	);

export const WebSearchTool = createTool({
	id: "web_search",
	description:
		"Search the web for up-to-date information on any topic. " +
		"Use this tool when you need current information beyond your knowledge cutoff. " +
		"Returns search results with titles, URLs, and relevant excerpts from each page " +
		"(not full page content - for complete content, use the URL with a separate fetch tool).",
	inputSchema: inputWebSearchSchema,
	outputSchema: outputWebSearchSchema,
	execute: async ({ context, mastra }) => {
		const logger = mastra?.getLogger();

		try {
			if (!process.env.TAVILY_API_KEY) {
				const errorMsg = "Error: Missing the 'TAVILY_API_KEY' environment variable prevents web searches";
				logger?.error("WebSearchTool Error:", errorMsg);
				throw new Error(errorMsg);
			}

			const client = tavily({ apiKey: process.env.TAVILY_API_KEY });

			logger?.info(`WebSearchTool: Searching for "${context.query}" with max results: ${context.maxResults}`);

			const { results } = await client.search(context.query, {
				searchDepth: "advanced",
				autoParameters: true,
				maxResults: context.maxResults,
			});

			const searchResults = results.map((result) => {
				return {
					url: result.url,
					title: result.title,
					snippet: result.content,
				};
			});

			logger?.info(`WebSearchTool: Found ${searchResults.length} search results`);

			return searchResults;
		} catch (error) {
			logger?.error("WebSearchTool Error:", error);

			if (error instanceof Error) {
				// Return Tavily API error message directly
				return { error: error.message };
			}

			return { error: "An unexpected error occurred during search" };
		}
	},
});
