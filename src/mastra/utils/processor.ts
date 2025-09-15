import type { MastraMessageV2 } from "@mastra/core";
import type { Processor } from "@mastra/core/processors";
import { wrapMessage } from "./context";

/**
 * Processor that wraps user message text parts with environment details.
 *
 * This processor implements the Processor interface and is intended to be run
 * before messages are sent to the model. For each message with role "user",
 * it iterates over content parts and replaces text parts by calling
 * wrapMessage(part.text), thereby appending environment details.
 *
 * The transformation is performed in-place on the provided messages array.
 *
 * @implements {Processor}
 */
export class UserMessageWrapper implements Processor {
	readonly name = "user-message-wrapper";

	/**
	 * Process input messages by wrapping text parts of user messages.
	 *
	 * Iterates over the provided messages array and for each message whose
	 * role is "user" replaces the text of parts with type "text" by the
	 * output of wrapMessage. The original messages array is mutated and
	 * returned for convenience.
	 *
	 * @param {{ messages: MastraMessageV2[] }} param0 - Object containing the messages array to process.
	 * @returns {MastraMessageV2[]} The same messages array after modification.
	 */
	processInput({ messages }: { messages: MastraMessageV2[] }): MastraMessageV2[] {
		if (!Array.isArray(messages) || messages.length === 0) return messages;
		messages.forEach((msg) => {
			if (msg.role !== "user") return;
			msg.content.parts.forEach((part) => {
				if (part.type !== "text") return;
				const text = part.text ?? "";
				// Idempotency: avoid double wrap if already contains markers
				if (text.includes("<environment_details>") || text.includes("<message>")) return;
				part.text = wrapMessage(text);
			});
		});
		return messages;
	}
}
