import { Agent } from "@mastra/core/agent";
import { LibSQLStore } from "@mastra/libsql";
import { Memory } from "@mastra/memory";
import { openrouter } from "../provider";
import { docsMcp } from "../tools/docs-mcp";
import { thinkingMcp } from "../tools/thinking-mcp";

export const libdocsAgent = new Agent({
	name: "LibDocs Agent",
	description:
		"An agent that provides documentation and information about libraries and their usage.",
	instructions: ``,
	model: openrouter("qwen/qwen3-235b-a22b-2507"),
	tools: async () => {
		const [thinkingTools, docsTools] = await Promise.all([
			thinkingMcp.getTools(),
			docsMcp.getTools(),
		]);
		return { ...thinkingTools, ...docsTools };
	},
	memory: new Memory({
		storage: new LibSQLStore({
			url: "file:../libdocs.db",
		}),
	}),
});
