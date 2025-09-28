const CACHE_MAX_ENTRIES = 50;
const CACHE_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

type LoggerLike = {
	info: (message: string) => void;
};

type BaseCacheEntry = {
	searchTerm: string;
	aliases?: string[];
	sourceType: "official" | "mirror" | "website";
	resolvedAt: string;
	lastAccessedAt: number;
	updatedAt: number;
};

export type Context7CacheEntry = BaseCacheEntry & {
	kind: "context7";
	libraryId: string;
	trustScore?: number;
	snippetCount?: number;
};

export type DeepWikiCacheEntry = BaseCacheEntry & {
	kind: "deepwiki";
	sourceType: "official" | "mirror";
	repository: string;
};

export type CacheEntry = Context7CacheEntry | DeepWikiCacheEntry;

type Context7CacheInput = Omit<Context7CacheEntry, "kind" | "lastAccessedAt" | "updatedAt">;
type DeepWikiCacheInput = Omit<DeepWikiCacheEntry, "kind" | "lastAccessedAt" | "updatedAt">;

export type CacheEntryInput = ({ kind: "context7" } & Context7CacheInput) | ({ kind: "deepwiki" } & DeepWikiCacheInput);

export type CacheSnapshot = {
	libraries: Array<Omit<Context7CacheEntry, "kind" | "lastAccessedAt" | "updatedAt">>;
	repositories: Array<Omit<DeepWikiCacheEntry, "kind" | "lastAccessedAt" | "updatedAt">>;
};

class Mutex {
	private mutex = Promise.resolve();

	async runExclusive<T>(callback: () => Promise<T> | T): Promise<T> {
		const previous = this.mutex;
		let release: () => void = () => {};
		this.mutex = new Promise<void>((resolve) => {
			release = resolve;
		});
		await previous;
		try {
			return await callback();
		} finally {
			release();
		}
	}
}

function normalizeKey(term: string): string {
	return term.trim().toLowerCase();
}

export class LibraryCacheStore {
	private static instance: LibraryCacheStore | undefined;
	private readonly entries = new Map<string, CacheEntry>();
	private readonly aliasIndex = new Map<string, string>();
	private readonly mutex = new Mutex();
	private logger: LoggerLike | undefined;

	private constructor() {}

	static getInstance(): LibraryCacheStore {
		if (!LibraryCacheStore.instance) {
			LibraryCacheStore.instance = new LibraryCacheStore();
		}
		return LibraryCacheStore.instance;
	}

	setLogger(logger: LoggerLike | undefined): void {
		this.logger = logger;
	}

	async upsert(entry: CacheEntryInput): Promise<CacheEntry> {
		return this.mutex.runExclusive(() => {
			const now = Date.now();
			this.pruneExpired(now);

			const key = normalizeKey(entry.searchTerm);
			const nextEntry: CacheEntry = {
				...entry,
				lastAccessedAt: now,
				updatedAt: now,
			};

			const existing = this.entries.get(key);
			if (existing) {
				this.removeAliasIndex(existing, key);
			}

			this.entries.set(key, nextEntry);
			this.registerAliasIndex(nextEntry, key);
			this.enforceCapacity();

			if (this.logger) {
				const target = nextEntry.kind === "context7" ? nextEntry.libraryId : nextEntry.repository;
				this.logger.info(`library-cache-store: upsert entry [${nextEntry.kind}] ${nextEntry.searchTerm} -> ${target}`);
			}

			return nextEntry;
		});
	}

	async get(searchTermOrAlias: string): Promise<CacheEntry | undefined> {
		return this.mutex.runExclusive(() => {
			const now = Date.now();
			this.pruneExpired(now);
			const key = this.resolveKey(searchTermOrAlias);
			if (!key) return undefined;
			const entry = this.entries.get(key);
			if (!entry) return undefined;
			entry.lastAccessedAt = now;
			return { ...entry };
		});
	}

	async getSnapshot(limit: number, kind: "context7" | "deepwiki" | "all" = "all"): Promise<CacheSnapshot> {
		return this.mutex.runExclusive(() => {
			const now = Date.now();
			this.pruneExpired(now);
			const filtered = Array.from(this.entries.values()).filter((entry) => {
				if (kind === "all") return true;
				return entry.kind === kind;
			});
			const sorted = filtered.sort((a, b) => b.updatedAt - a.updatedAt);
			const slice = sorted.slice(0, limit).map((entry) => {
				return { ...entry };
			});
			const libraries: CacheSnapshot["libraries"] = [];
			const repositories: CacheSnapshot["repositories"] = [];
			slice.forEach((entry) => {
				if (entry.kind === "context7") {
					const { kind: _kind, lastAccessedAt: _last, updatedAt: _updated, ...rest } = entry;
					libraries.push(rest);
					return;
				}
				const { kind: _kind, lastAccessedAt: _last, updatedAt: _updated, ...rest } = entry;
				repositories.push(rest);
			});
			return { libraries, repositories };
		});
	}

	private resolveKey(searchTermOrAlias: string): string | undefined {
		const normalized = normalizeKey(searchTermOrAlias);
		if (this.entries.has(normalized)) return normalized;
		return this.aliasIndex.get(normalized);
	}

	private pruneExpired(now: number): void {
		for (const [key, entry] of this.entries) {
			if (now - entry.updatedAt > CACHE_TTL_MS) {
				this.removeEntry(key);
			}
		}
	}

	private enforceCapacity(): void {
		if (this.entries.size <= CACHE_MAX_ENTRIES) return;
		const entriesArray = Array.from(this.entries.entries()).sort((a, b) => a[1].lastAccessedAt - b[1].lastAccessedAt);
		while (entriesArray.length > 0 && this.entries.size > CACHE_MAX_ENTRIES) {
			const entry = entriesArray.shift();
			if (entry) {
				const [key] = entry;
				this.removeEntry(key);
			}
		}
	}

	private removeEntry(key: string): void {
		const entry = this.entries.get(key);
		if (!entry) return;
		this.entries.delete(key);
		this.removeAliasIndex(entry, key);
		if (this.logger) {
			const target = entry.kind === "context7" ? entry.libraryId : entry.repository;
			this.logger.info(`library-cache-store: removed entry [${entry.kind}] ${entry.searchTerm} -> ${target}`);
		}
	}

	private registerAliasIndex(entry: CacheEntry, key: string): void {
		if (!entry.aliases) return;
		entry.aliases.forEach((alias) => {
			const aliasKey = normalizeKey(alias);
			this.aliasIndex.set(aliasKey, key);
		});
	}

	private removeAliasIndex(entry: CacheEntry, key: string): void {
		if (!entry.aliases) return;
		entry.aliases.forEach((alias) => {
			const aliasKey = normalizeKey(alias);
			const mappedKey = this.aliasIndex.get(aliasKey);
			if (mappedKey === key) {
				this.aliasIndex.delete(aliasKey);
			}
		});
	}
}

export const DEFAULT_CACHE_INJECTION_LIMIT = 20;
