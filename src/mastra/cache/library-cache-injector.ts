import type { MastraMessageV2 } from "@mastra/core";
import type { Processor } from "@mastra/core/processors";

import {
	context7CacheRepository,
	DEFAULT_CACHE_INJECTION_LIMIT,
	deepWikiCacheRepository,
} from "./library-cache-repository";

export type LibraryCacheKind = "context7" | "deepwiki";

type InjectorOptions = {
	limit?: number;
	kind?: LibraryCacheKind;
};

type MessagePart = MastraMessageV2["content"]["parts"][number];
type TextMessagePart = Extract<MessagePart, { type: "text" }>;

function isTextMessagePart(part: MessagePart): part is TextMessagePart {
	return part.type === "text" && typeof (part as { text?: unknown }).text === "string";
}

export class LibraryCacheInjector implements Processor {
	readonly name = "library-cache-injector";
	private readonly limit: number;
	private readonly kind: LibraryCacheKind;

	constructor(options: InjectorOptions = {}) {
		this.limit = Math.max(1, options.limit ?? DEFAULT_CACHE_INJECTION_LIMIT);
		this.kind = options.kind ?? "context7";
	}

	async processInput({ messages }: { messages: MastraMessageV2[] }): Promise<MastraMessageV2[]> {
		if (!Array.isArray(messages) || messages.length === 0) return messages;

		const entries = this.kind === "context7" ? context7CacheRepository.getAll() : deepWikiCacheRepository.getAll();

		if (entries.length === 0) {
			return messages;
		}

		const payload = entries.slice(-this.limit);
		const reminderBlock = `<system-reminder>\nCurrent cache state (JSON):\n${JSON.stringify(payload, null, 2)}\n</system-reminder>`;

		for (const msg of messages) {
			if (msg.role !== "user") continue;

			const textParts = msg.content.parts.filter(isTextMessagePart);
			const alreadyInjected = textParts.some((part) => part.text.includes("<system-reminder>"));
			if (alreadyInjected) continue;

			const firstTextPart = textParts[0];
			if (firstTextPart) {
				firstTextPart.text = `${reminderBlock}\n${firstTextPart.text}`;
				continue;
			}

			msg.content.parts.unshift({ type: "text", text: reminderBlock } as TextMessagePart);
		}

		return messages;
	}
}
