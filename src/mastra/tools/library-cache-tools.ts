import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { context7CacheRepository, deepWikiCacheRepository } from "../cache/library-cache-repository";
import {
	type Context7CacheEntry,
	type Context7CacheEntryInput,
	context7CacheEntrySchema,
	type DeepWikiCacheEntry,
	type DeepWikiCacheEntryInput,
	deepWikiCacheEntrySchema,
} from "../cache/schema";

type LoggerInput = Parameters<typeof context7CacheRepository.setLogger>[0];

const context7OutputSchema = z.object({
	status: z.literal("updated"),
	kind: z.literal("context7"),
	name: z.string(),
	totalEntries: z.number().int().min(0),
});

const deepWikiOutputSchema = z.object({
	status: z.literal("updated"),
	kind: z.literal("deepwiki"),
	name: z.string(),
	totalEntries: z.number().int().min(0),
});

function setLogger(logger?: LoggerInput) {
	context7CacheRepository.setLogger(logger);
	deepWikiCacheRepository.setLogger(logger);
}

function upsertContext7Entry(input: Context7CacheEntryInput): Context7CacheEntry {
	return context7CacheRepository.upsert(input);
}

function upsertDeepWikiEntry(input: DeepWikiCacheEntryInput): DeepWikiCacheEntry {
	return deepWikiCacheRepository.upsert(input);
}

export const LibraryCacheUpdateContext7Tool = createTool({
	id: "library_cache_update_context7",
	description:
		"Update the in-memory cache with the latest Context7 library identifier. " +
		"Call this tool immediately after Context7 returns a libraryId so future requests can reuse the cached result.",
	inputSchema: context7CacheEntrySchema.omit({ resolvedAt: true }),
	outputSchema: context7OutputSchema,
	execute: async ({ context, mastra }) => {
		const logger = mastra?.getLogger();
		setLogger(logger);
		const entry = upsertContext7Entry(context);
		return {
			status: "updated" as const,
			kind: "context7" as const,
			name: entry.names[0],
			totalEntries: context7CacheRepository.size(),
		};
	},
});

export const LibraryCacheUpdateDeepWikiTool = createTool({
	id: "library_cache_update_deepwiki",
	description:
		"Update the in-memory cache with the latest DeepWiki repository resolution. " +
		"Call this tool after validating a repository so the agent can avoid redundant lookups.",
	inputSchema: deepWikiCacheEntrySchema.omit({ resolvedAt: true }),
	outputSchema: deepWikiOutputSchema,
	execute: async ({ context, mastra }) => {
		const logger = mastra?.getLogger();
		setLogger(logger);
		const entry = upsertDeepWikiEntry(context);
		return {
			status: "updated" as const,
			kind: "deepwiki" as const,
			name: entry.names[0],
			totalEntries: deepWikiCacheRepository.size(),
		};
	},
});
