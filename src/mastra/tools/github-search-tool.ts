import { createTool } from "@mastra/core/tools";
import { Octokit, RequestError } from "octokit";
import { z } from "zod";

const octokit = new Octokit({
	auth: process.env.GITHUB_PERSONAL_ACCESS_TOKEN, // Optional: Use a GitHub token to increase rate limits
});

const GitHubSearchToolInputSchema = z.object({
	query: z.string().describe("Library or project name to search"),
	language: z
		.string()
		.optional()
		.describe(
			"Programming language filter. " +
				"Recommended to omit for initial search to get broader results. " +
				"Use only when refining results if initial search is unsatisfactory.",
		),
});

const GitHubSearchToolOutputSchema = z
	.object({
		repositories: z.array(
			z.object({
				repository: z.string(),
				url: z.string(),
				stars: z.number(),
				description: z.string().nullable(),
				is_fork: z.boolean(),
				language: z.string().nullable(),
			}),
		),
	})
	.or(
		z.object({
			error: z.string(),
		}),
	);

export const GitHubSearchTool = createTool({
	id: "github_search_repository",
	description:
		"Search GitHub repositories by name and return up to 5 most relevant repositories with complete details including stars, description, language, and whether it's a fork. Language filtering is optional and should be used for refinement only.",
	inputSchema: GitHubSearchToolInputSchema,
	outputSchema: GitHubSearchToolOutputSchema,
	execute: async ({ context, mastra }) => {
		const logger = mastra?.getLogger();
		const { query, language } = context;
		const searchQuery = language ? `${query}+language:${language}` : query;

		logger?.info(`GitHubSearchTool: Searching for "${query}" with language filter: ${language || "none"}`);

		try {
			const result = await octokit.rest.search.repos({
				q: searchQuery,
				sort: "stars",
				order: "desc",
				per_page: 5,
			});

			if (result.data.items && result.data.items.length > 0) {
				// Return all repositories with full details
				const repositories = result.data.items.map((repo) => ({
					repository: repo.full_name, // owner/repo format
					url: repo.html_url,
					stars: repo.stargazers_count,
					description: repo.description,
					is_fork: repo.fork,
					language: repo.language,
				}));
				logger?.info(`GitHubSearchTool: Found ${repositories.length} repositories`);
				return { repositories };
			}

			logger?.info(`GitHubSearchTool: No repositories found for query "${query}"`);
			return { error: "No repositories found for the given query" };
		} catch (error) {
			logger?.error("GitHubSearchTool Error:", error);

			if (error instanceof RequestError) {
				// Handle GitHub API specific errors
				switch (error.status) {
					case 422:
						return {
							error: "Invalid search query. Please check your query format.",
						};
					case 403:
						return {
							error: "GitHub API rate limit exceeded. Please try again later or provide a GitHub token.",
						};
					case 404:
						return {
							error: "No repositories found for the given query.",
						};
					default:
						return {
							error: `GitHub API error (${error.status}): ${error.message}`,
						};
				}
			}
			return {
				error: `Failed to search GitHub repositories: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	},
});
