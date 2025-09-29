import {
	type Context7CacheEntry,
	type Context7CacheEntryInput,
	context7CacheEntrySchema,
	type DeepWikiCacheEntry,
	type DeepWikiCacheEntryInput,
	deepWikiCacheEntrySchema,
} from "./schema";

type LoggerLike = {
	info: (message: string) => void;
};

type CacheEntryBase = {
	names: string[];
	resolvedAt: string;
};

const DEFAULT_CACHE_MAX_ENTRIES = 50;
export const DEFAULT_CACHE_INJECTION_LIMIT = 20;

function cloneEntry<Entry extends CacheEntryBase>(entry: Entry): Entry {
	return { ...(entry as Record<string, unknown>), names: [...entry.names] } as Entry;
}

abstract class BaseCacheRepository<Entry extends CacheEntryBase, Input> {
	private readonly entries = new Map<string, Entry>();
	private readonly order: string[] = [];
	private logger: LoggerLike | undefined;

	constructor(private readonly maxEntries: number = DEFAULT_CACHE_MAX_ENTRIES) {}

	setLogger(logger: LoggerLike | undefined): void {
		this.logger = logger;
	}

	clear(): void {
		this.entries.clear();
		this.order.length = 0;
	}

	size(): number {
		return this.entries.size;
	}

	getAll(): Entry[] {
		return this.order
			.map((key) => this.entries.get(key))
			.filter((entry): entry is Entry => Boolean(entry))
			.map((entry) => cloneEntry(entry));
	}

	getByName(name: string): Entry | undefined {
		const normalized = name.trim().toLowerCase();
		for (const key of this.order) {
			const entry = this.entries.get(key);
			if (!entry) continue;
			if (entry.names.some((candidate) => candidate === normalized)) {
				return cloneEntry(entry);
			}
		}
		return undefined;
	}

	upsert(input: Input): Entry {
		const parsed = this.parseInput(input);
		const canonical = parsed.names[0];
		const existingKey = this.resolveExistingKey(canonical, parsed);

		if (existingKey && existingKey !== canonical) {
			this.entries.delete(existingKey);
			this.removeKey(existingKey);
		}

		const hadCanonical = this.entries.has(canonical);

		this.entries.set(canonical, cloneEntry(parsed));

		if (!hadCanonical) {
			this.order.push(canonical);
			this.enforceCapacity();
		}

		this.logger?.info(`library-cache: upsert ${this.kindLabel()} ${canonical} -> ${this.targetIdentifier(parsed)}`);

		return cloneEntry(parsed);
	}

	protected abstract kindLabel(): "context7" | "deepwiki";
	protected abstract targetIdentifier(entry: Entry): string;
	protected abstract parseInput(input: Input): Entry;

	protected isSameResource(existing: Entry, candidate: Entry): boolean {
		return existing.names.some((name) => candidate.names.includes(name));
	}

	private resolveExistingKey(canonical: string, entry: Entry): string | null {
		if (this.entries.has(canonical)) return canonical;

		for (const key of this.order) {
			const existing = this.entries.get(key);
			if (!existing) continue;
			if (this.isSameResource(existing, entry)) {
				return key;
			}
		}

		return null;
	}

	private removeKey(key: string): void {
		const index = this.order.indexOf(key);
		if (index >= 0) {
			this.order.splice(index, 1);
		}
	}

	private enforceCapacity(): void {
		while (this.order.length > this.maxEntries) {
			const key = this.order.shift();
			if (!key) break;
			const entry = this.entries.get(key);
			if (!entry) continue;
			this.entries.delete(key);
			this.logger?.info(
				`library-cache: evict ${this.kindLabel()} ${entry.names[0]} -> ${this.targetIdentifier(entry)}`,
			);
		}
	}
}

export class Context7CacheRepository extends BaseCacheRepository<Context7CacheEntry, Context7CacheEntryInput> {
	protected kindLabel(): "context7" {
		return "context7";
	}

	protected targetIdentifier(entry: Context7CacheEntry): string {
		return entry.libraryId;
	}

	protected parseInput(input: Context7CacheEntryInput): Context7CacheEntry {
		return context7CacheEntrySchema.parse(input);
	}

	protected override isSameResource(existing: Context7CacheEntry, candidate: Context7CacheEntry): boolean {
		if (existing.libraryId === candidate.libraryId) return true;
		return super.isSameResource(existing, candidate);
	}
}

export class DeepWikiCacheRepository extends BaseCacheRepository<DeepWikiCacheEntry, DeepWikiCacheEntryInput> {
	protected kindLabel(): "deepwiki" {
		return "deepwiki";
	}

	protected targetIdentifier(entry: DeepWikiCacheEntry): string {
		return entry.repository;
	}

	protected parseInput(input: DeepWikiCacheEntryInput): DeepWikiCacheEntry {
		return deepWikiCacheEntrySchema.parse(input);
	}

	protected override isSameResource(existing: DeepWikiCacheEntry, candidate: DeepWikiCacheEntry): boolean {
		if (existing.repository === candidate.repository) return true;
		return super.isSameResource(existing, candidate);
	}
}

export const context7CacheRepository = new Context7CacheRepository();
export const deepWikiCacheRepository = new DeepWikiCacheRepository();
