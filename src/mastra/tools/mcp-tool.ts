import { MCPClient } from "@mastra/mcp";

export const context7Mcp = new MCPClient({
	servers: {
		context7: {
			url: new URL("https://mcp.context7.com/mcp"),
		},
	},
});

export const deepwikiMcp = new MCPClient({
	servers: {
		deepwiki: {
			url: new URL("https://mcp.deepwiki.com/mcp"),
		},
	},
});
