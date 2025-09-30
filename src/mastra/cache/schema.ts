import { z } from "zod";

const namesSchema = z
	.array(z.string().trim().min(1, "Name must not be empty"))
	.min(1, "At least one name is required")
	.transform((values) => {
		const unique: string[] = [];
		const seenLower = new Set<string>();
		for (const value of values) {
			const key = value.toLowerCase();
			if (seenLower.has(key)) continue;
			unique.push(value); // preserve original casing
			seenLower.add(key);
		}
		return unique;
	})
	.describe("Ordered list of canonical name and aliases. The first element is the canonical lookup key.");

export const context7CacheEntrySchema = z
	.object({
		names: namesSchema,
		libraryId: z
			.string()
			.trim()
			.min(1, "libraryId is required")
			.describe("Context7 library identifier (e.g., /vercel/react or /vercel/react/v19.0.0)."),
		sourceType: z
			.enum(["official", "llmstxt", "website"])
			.describe("Classify the origin of the result: official maintainers, llmstxt snapshots, or general websites."),
		trustScore: z.number().min(0).max(10).optional().describe("Optional Context7 trust score between 0 and 10."),
		snippetCount: z.number().int().min(0).optional().describe("Optional count of Context7 documentation snippets."),
		resolvedAt: z.iso
			.datetime()
			.default(() => new Date().toISOString())
			.describe("ISO 8601 timestamp for the most recent resolution."),
	})
	.describe("Context7 cache entry payload.");

export const deepWikiCacheEntrySchema = z
	.object({
		names: namesSchema,
		repository: z.string().trim().min(1, "repository is required").describe("GitHub repository in owner/repo format."),
		sourceType: z.enum(["official", "mirror"]).describe("Classify the repository origin: official upstream or mirror."),
		resolvedAt: z.iso
			.datetime()
			.default(() => new Date().toISOString())
			.describe("ISO 8601 timestamp for when the repository was confirmed."),
	})
	.describe("DeepWiki cache entry payload.");

export type Context7CacheEntryInput = z.input<typeof context7CacheEntrySchema>;
export type Context7CacheEntry = z.output<typeof context7CacheEntrySchema>;

export type DeepWikiCacheEntryInput = z.input<typeof deepWikiCacheEntrySchema>;
export type DeepWikiCacheEntry = z.output<typeof deepWikiCacheEntrySchema>;
