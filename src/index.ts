import { MCPServer } from "@mastra/mcp";
import { SetLevelRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { libdocsAgent } from "./mastra/agents/libdocs-agent";
import { weatherAgent } from "./mastra/agents/weather-agent";
import { weatherTool } from "./mastra/tools/weather-tool";

const server = new MCPServer({
	name: "libdocs-mcp-server",
	version: "0.0.1",
	agents: { weatherAgent, libdocsAgent },
	tools: { weatherTool },
});

// Set up request handler for setting log level
server.getServer().setRequestHandler(SetLevelRequestSchema, async () => ({}));

server.startStdio().catch((error) => {
	console.error("Error running MCP server:", error);
	process.exit(1);
});
