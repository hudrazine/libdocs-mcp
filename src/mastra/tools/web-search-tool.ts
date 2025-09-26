import { createTool } from "@mastra/core/tools";
import { tavily } from "@tavily/core";
import { z } from "zod";

const inputWebSearchSchema = z.object({
	query: z
		.string()
		.min(2)
		.max(400)
		.describe(
			"The search query or keywords to look up. For recent or current information, you can include the actual current year in the query for better relevance (e.g., 'AI developments 2025' instead of 'latest AI developments'), or use the timeRange option to filter results by recency.",
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
	timeRange: z
		.enum(["day", "week", "month", "year"])
		.optional()
		.describe(
			"Optional time range to filter search results by publication date, starting from the current date. If not specified, results from all time periods are returned. This ensures recent sources for up-to-date queries like news or current events. Valid values: 'day' (last 24 hours), 'week' (last 7 days), 'month' (last 30 days), 'year' (last 365 days).",
		),
	includeDomains: z
		.array(z.string())
		.max(300)
		.optional()
		.describe(
			"Optional array of domain names to include in search results. Restrict to trusted or specific sources to improve relevance and reduce irrelevant results (maximum 300 domains; keep the list concise and query-relevant, e.g., ['linkedin.com', 'crunchbase.com'] for company background searches). If not specified, results from all domains are returned.",
		),
	excludeDomains: z
		.array(z.string())
		.max(150)
		.optional()
		.describe(
			"Optional array of domain names to exclude from search results. Filter out unreliable, spammy, or off-topic sources to focus on quality content (maximum 150 domains; keep the list concise, e.g., ['espn.com', 'vogue.com'] for economy trends avoiding sports/fashion sites). If not specified, no domains are excluded.",
		),
});

const outputWebSearchSchema = z
	.array(
		z.object({
			// The URL of the search result
			url: z.url(),
			// The title of the search result
			title: z.string(),
			// A query-relevant excerpt from the web page, not the complete content. For full page content, use the URL with a fetch tool.
			snippet: z.string(),
			// A relevance score for the result, with higher numbers indicating greater relevance to the query.
			score: z.number(),
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
				timeRange: context.timeRange,
				includeDomains: context.includeDomains,
				excludeDomains: context.excludeDomains,
			});

			const searchResults = results.map((result) => {
				return {
					url: result.url,
					title: result.title,
					snippet: result.content,
					score: result.score,
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
