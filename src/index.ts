import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// import { z } from "zod/v3"; // with [TS2589: Type instantiation is excessively deep and possibly infinite.]
// Note: "zod/v3" causes TS2589 errors, so use a previous version
// to maintain compatibility with the MCP schema definition.
import { z } from "zod-v3";

import * as pkg from "../package.json";
import { mastra } from "./mastra";

const server = new McpServer({
	name: pkg.name,
	version: pkg.version,
});

const logger = mastra.getLogger();
const { Context7Agent, DeepWikiAgent, WebResearchAgent } = mastra.getAgents();

server.registerTool(
	"library_docs_lookup",
	{
		title: "Library Documentation Lookup",
		description: Context7Agent.getDescription(),
		inputSchema: {
			prompt: z
				.string()
				.describe(
					"Library name, version, and specific documentation query. " +
						"Examples: 'React hooks documentation', 'express v4 middleware API', " +
						"'pandas DataFrame methods', 'tensorflow 2.x model.fit parameters'",
				),
		},
	},
	async ({ prompt }, { requestId, signal }) => {
		try {
			// Check if request was already cancelled
			if (signal.aborted) {
				logger.debug("library_docs_lookup_aborted_pre", { requestId, stage: "pre-exec", reason: signal.reason });
				return {
					content: [{ type: "text", text: "Request was cancelled before execution" }],
					isError: true,
				};
			}

			const response = await Context7Agent.generateVNext(prompt, {
				maxSteps: 20,
				memory: {
					resource: "library-docs-resource",
					thread: requestId.toString(),
				},
				options: { abortSignal: signal },
			});

			if (response.error) {
				const errorMessage =
					typeof response.error === "string" ? response.error : response.error.message || "Unknown error occurred";
				logger.error("library_docs_lookup_error", { requestId, error: errorMessage });
				return {
					content: [{ type: "text", text: `Library docs agent error: ${errorMessage}` }],
					isError: true,
				};
			}

			if (response.finishReason !== "stop") {
				logger.error("library_docs_lookup_unexpected_finish", {
					requestId,
					finishReason: response.finishReason,
					expected: "stop",
					steps: response.steps?.length,
					hasText: Boolean(response.text),
				});
				return {
					content: [
						{
							type: "text",
							text: `Library docs agent error: finishReason="${response.finishReason}" (expected "stop"). No final answer produced. Retry with a more specific query; if it persists report this with requestId=${requestId}.`,
						},
					],
					isError: true,
				};
			}

			return {
				content: [{ type: "text", text: response.text }],
			};
		} catch (err: unknown) {
			const error = err as Error;

			// Cancellation during execution
			if (signal.aborted) {
				logger.warn("library_docs_lookup_aborted_during", { requestId, stage: "execute", reason: signal.reason });
				return {
					content: [{ type: "text", text: "Library docs agent error: request cancelled during execution" }],
					isError: true,
				};
			}

			// Unified error handling
			logger.error("library_docs_lookup_failure", { requestId, cause: error });
			return {
				content: [{ type: "text", text: `Library docs agent error: ${error.message || "Unknown error occurred"}` }],
				isError: true,
			};
		}
	},
);

server.registerTool(
	"github_repo_analyzer",
	{
		title: "GitHub Repository Analyzer",
		description: DeepWikiAgent.getDescription(),
		inputSchema: {
			prompt: z
				.string()
				.describe(
					"Repository name (owner/repo format) or search query, and technical question. " +
						"Examples: 'facebook/react component lifecycle implementation', " +
						"'express repository architecture overview', " +
						"'how does vue handle reactivity system'",
				),
		},
	},
	async ({ prompt }, { requestId, signal }) => {
		try {
			// Pre-execution cancellation check (uniform with library_docs_lookup)
			if (signal.aborted) {
				logger.debug("github_repo_analyzer_aborted_pre", { requestId, stage: "pre-exec", reason: signal.reason });
				return {
					content: [{ type: "text", text: "Request was cancelled before execution" }],
					isError: true,
				};
			}

			const response = await DeepWikiAgent.generateVNext(prompt, {
				maxSteps: 25,
				memory: {
					resource: "github-repo-resource",
					thread: requestId.toString(),
				},
				options: { abortSignal: signal },
			});

			if (response.error) {
				const errorMessage =
					typeof response.error === "string" ? response.error : response.error.message || "Unknown error occurred";
				logger.error("github_repo_analyzer_error", { requestId, error: errorMessage });
				return {
					content: [{ type: "text", text: `GitHub repository analysis error: ${errorMessage}` }],
					isError: true,
				};
			}

			if (response.finishReason !== "stop") {
				logger.error("github_repo_analyzer_unexpected_finish", {
					requestId,
					finishReason: response.finishReason,
					expected: "stop",
					steps: response.steps?.length,
					hasText: Boolean(response.text),
				});
				return {
					content: [
						{
							type: "text",
							text: `GitHub repository analysis error: finishReason="${response.finishReason}" (expected "stop"). No final answer produced. Retry with a more specific query; if it persists report this with requestId=${requestId}.`,
						},
					],
					isError: true,
				};
			}

			return {
				content: [{ type: "text", text: response.text }],
			};
		} catch (err: unknown) {
			const error = err as Error;

			if (signal.aborted) {
				logger.warn("github_repo_analyzer_aborted_during", { requestId, stage: "execute", reason: signal.reason });
				return {
					content: [{ type: "text", text: "GitHub repository analysis error: request cancelled during execution" }],
					isError: true,
				};
			}

			logger.error("github_repo_analyzer_failure", { requestId, cause: error });
			return {
				content: [
					{ type: "text", text: `GitHub repository analysis error: ${error.message || "Unknown error occurred"}` },
				],
				isError: true,
			};
		}
	},
);

server.registerTool(
	"web_research_assistant",
	{
		title: "Web Research Assistant",
		description: WebResearchAgent.getDescription(),
		inputSchema: {
			prompt: z
				.string()
				.describe(
					"Research topic requiring broad web coverage. " +
						"Best for: technology news, library comparisons, tutorials, " +
						"troubleshooting guides, community discussions. " +
						"Example: 'compare React vs Vue performance in 2025', " +
						"'latest Next.js 15 features and breaking changes'",
				),
		},
	},
	async ({ prompt }, { requestId, signal }) => {
		try {
			// Pre-execution cancellation check (uniform with library_docs_lookup)
			if (signal.aborted) {
				logger.debug("web_research_assistant_aborted_pre", { requestId, stage: "pre-exec", reason: signal.reason });
				return {
					content: [{ type: "text", text: "Request was cancelled before execution" }],
					isError: true,
				};
			}

			const response = await WebResearchAgent.generateVNext(prompt, {
				maxSteps: 30,
				options: { abortSignal: signal },
			});

			if (response.error) {
				const errorMessage =
					typeof response.error === "string" ? response.error : response.error.message || "Unknown error occurred";
				logger.error("web_research_assistant_error", { requestId, error: errorMessage });
				return {
					content: [{ type: "text", text: `Web research error: ${errorMessage}` }],
					isError: true,
				};
			}

			if (response.finishReason !== "stop") {
				logger.error("web_research_assistant_unexpected_finish", {
					requestId,
					finishReason: response.finishReason,
					expected: "stop",
					steps: response.steps?.length,
					hasText: Boolean(response.text),
				});
				return {
					content: [
						{
							type: "text",
							text: `Web research error: finishReason="${response.finishReason}" (expected "stop"). No final answer produced. Retry with a more specific query; if it persists report this with requestId=${requestId}.`,
						},
					],
					isError: true,
				};
			}

			return {
				content: [{ type: "text", text: response.text }],
			};
		} catch (err: unknown) {
			const error = err as Error;

			if (signal.aborted) {
				logger.warn("web_research_assistant_aborted_during", { requestId, stage: "execute", reason: signal.reason });
				return {
					content: [{ type: "text", text: "Web research error: request cancelled during execution" }],
					isError: true,
				};
			}

			logger.error("web_research_assistant_failure", { requestId, cause: error });
			return {
				content: [{ type: "text", text: `Web research error: ${error.message || "Unknown error occurred"}` }],
				isError: true,
			};
		}
	},
);

const transport = new StdioServerTransport();
await server.connect(transport).catch((error) => {
	console.error("Error running MCP server:", error);
	process.exit(1);
});
