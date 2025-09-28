import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { DEFAULT_CACHE_INJECTION_LIMIT, LibraryCacheStore } from "../cache/library-cache-store";

const context7InputSchema = z
	.object({
		searchTerm: z
			.string()
			.min(1)
			.describe(
				"Primary library name or search phrase provided by the user. Case-insensitive and used as the cache key.",
			),
		libraryId: z
			.string()
			.min(1)
			.describe(
				"Context7 library identifier in the form /org/project or /org/project/version. Always provide the exact ID returned by Context7.",
			),
		aliases: z
			.array(z.string().min(1))
			.max(10)
			.optional()
			.describe(
				"Optional array of alternative names, abbreviations, or spellings the user may use for the same library (maximum 10).",
			),
		sourceType: z
			.enum(["official", "mirror", "website"])
			.describe(
				"Categorize the library source: 'official' for maintainer-owned, 'mirror' for mirrored copies, 'website' for documentation-specific sites.",
			),
		trustScore: z
			.number()
			.min(0)
			.max(10)
			.optional()
			.describe(
				"Optional trust score reported by Context7 (0-10). Provide when available to help prioritize authoritative sources.",
			),
		snippetCount: z
			.number()
			.int()
			.min(0)
			.optional()
			.describe(
				"Optional total snippet count from Context7 search. Supply when returned to gauge documentation coverage.",
			),
		resolvedAt: z
			.string()
			.datetime()
			.describe(
				"ISO-8601 timestamp for when this libraryId was last confirmed by Context7 (e.g., 2025-09-27T12:34:56.000Z).",
			),
	})
	.describe("Cache entry payload for Context7 library resolution results.");

const deepwikiInputSchema = z
	.object({
		searchTerm: z
			.string()
			.min(1)
			.describe(
				"Primary repository name or search phrase provided by the user. Case-insensitive and used as the cache key.",
			),
		repository: z
			.string()
			.min(3)
			.describe("GitHub repository identifier in the form owner/repo as returned by DeepWiki validation."),
		aliases: z
			.array(z.string().min(1))
			.max(10)
			.optional()
			.describe("Optional alternative repository names or search aliases (maximum 10)."),
		sourceType: z
			.enum(["official", "mirror"])
			.describe(
				"Classify the DeepWiki repository source: 'official' for canonical repos, 'mirror' for mirrored copies.",
			),
		resolvedAt: z
			.string()
			.datetime()
			.describe(
				"ISO-8601 timestamp for when this repository was confirmed via DeepWiki (e.g., 2025-09-27T12:34:56.000Z).",
			),
	})
	.describe("Cache entry payload for DeepWiki repository validation results.");

const context7OutputSchema = z.object({
	status: z.literal("updated"),
	type: z.literal("context7"),
	searchTerm: z.string(),
	totalCached: z.number().int().min(0),
});

const deepwikiOutputSchema = z.object({
	status: z.literal("updated"),
	type: z.literal("deepwiki"),
	searchTerm: z.string(),
	totalCached: z.number().int().min(0),
});

type LoggerInput = Parameters<LibraryCacheStore["setLogger"]>[0];

async function updateContext7Cache(payload: z.infer<typeof context7InputSchema>, logger?: LoggerInput) {
	const store = LibraryCacheStore.getInstance();
	store.setLogger(logger);

	await store.upsert({
		kind: "context7",
		searchTerm: payload.searchTerm,
		aliases: payload.aliases,
		sourceType: payload.sourceType,
		resolvedAt: payload.resolvedAt,
		libraryId: payload.libraryId,
		trustScore: payload.trustScore,
		snippetCount: payload.snippetCount,
	});

	const snapshot = await store.getSnapshot(DEFAULT_CACHE_INJECTION_LIMIT);
	return {
		status: "updated" as const,
		type: "context7" as const,
		searchTerm: payload.searchTerm,
		totalCached: snapshot.libraries.length + snapshot.repositories.length,
	};
}

async function updateDeepWikiCache(payload: z.infer<typeof deepwikiInputSchema>, logger?: LoggerInput) {
	const store = LibraryCacheStore.getInstance();
	store.setLogger(logger);

	await store.upsert({
		kind: "deepwiki",
		searchTerm: payload.searchTerm,
		aliases: payload.aliases,
		sourceType: payload.sourceType,
		resolvedAt: payload.resolvedAt,
		repository: payload.repository,
	});

	const snapshot = await store.getSnapshot(DEFAULT_CACHE_INJECTION_LIMIT);
	return {
		status: "updated" as const,
		type: "deepwiki" as const,
		searchTerm: payload.searchTerm,
		totalCached: snapshot.libraries.length + snapshot.repositories.length,
	};
}

export const LibraryCacheUpdateContext7Tool = createTool({
	id: "library_cache_update_context7",
	description:
		"Update the in-memory cache with the latest Context7 library identifier. " +
		"Call this tool immediately after Context7 returns a libraryId so future requests can reuse the cached result.",
	inputSchema: context7InputSchema,
	outputSchema: context7OutputSchema,
	execute: async ({ context, mastra }) => {
		const logger = mastra?.getLogger();
		return updateContext7Cache(context, logger);
	},
});

export const LibraryCacheUpdateDeepWikiTool = createTool({
	id: "library_cache_update_deepwiki",
	description:
		"Update the in-memory cache with the latest DeepWiki repository resolution. " +
		"Call this tool after validating a repository so the agent can avoid redundant lookups.",
	inputSchema: deepwikiInputSchema,
	outputSchema: deepwikiOutputSchema,
	execute: async ({ context, mastra }) => {
		const logger = mastra?.getLogger();
		return updateDeepWikiCache(context, logger);
	},
});
