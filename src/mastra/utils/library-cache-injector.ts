import type { MastraMessageV2 } from "@mastra/core";
import type { Processor } from "@mastra/core/processors";

import { DEFAULT_CACHE_INJECTION_LIMIT, LibraryCacheStore } from "../cache/library-cache-store";

type InjectorOptions = {
	limit?: number;
	kind?: "context7" | "deepwiki";
};

export class LibraryCacheInjector implements Processor {
	readonly name = "library-cache-injector";
	private readonly limit: number;
	private readonly kind: "context7" | "deepwiki" | "all";

	constructor(options: InjectorOptions = {}) {
		this.limit = options.limit ?? DEFAULT_CACHE_INJECTION_LIMIT;
		this.kind = options.kind ?? "all";
	}

	async processInput({ messages }: { messages: MastraMessageV2[] }): Promise<MastraMessageV2[]> {
		if (!Array.isArray(messages) || messages.length === 0) return messages;

		const store = LibraryCacheStore.getInstance();
		const snapshot = await store.getSnapshot(this.limit, this.kind);
		if (snapshot.libraries.length === 0 && snapshot.repositories.length === 0) {
			return messages;
		}

		let payload: Record<string, unknown>;
		if (this.kind === "context7") {
			payload = { libraries: snapshot.libraries };
		} else if (this.kind === "deepwiki") {
			payload = { repositories: snapshot.repositories };
		} else {
			payload = {
				libraries: snapshot.libraries,
				repositories: snapshot.repositories,
			};
		}

		const reminderBlock = `<system-reminder>\nCurrent cache state (JSON): ${JSON.stringify(payload)}\n</system-reminder>`;

		messages.forEach((msg) => {
			if (msg.role !== "user") return;
			for (const part of msg.content.parts) {
				if (part.type !== "text" || typeof part.text !== "string") continue;
				if (part.text.includes("<system-reminder>")) break;
				part.text = `${reminderBlock}\n${part.text}`;
				break;
			}
		});

		return messages;
	}
}
