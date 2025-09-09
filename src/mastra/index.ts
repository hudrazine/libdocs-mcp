import { Mastra } from "@mastra/core/mastra";
import { LibSQLStore } from "@mastra/libsql";
import { PinoLogger } from "@mastra/loggers";
import pino from "pino";
import { Context7Agent } from "./agents/context7-agent";
import { DeepWikiAgent } from "./agents/deepwiki-agent";
import { WebResearchAgent } from "./agents/web-research-agent";

export const mastra = new Mastra({
	agents: { Context7Agent, DeepWikiAgent, WebResearchAgent },
	storage: new LibSQLStore({
		// Primarily used for agents' memory;
		// currently only active during server runtime and not persisted
		url: ":memory:",
	}),
	logger: new PinoLogger({
		name: "LibDocs MCP",
		level: "info",
		// Log to stderr because stdio-based MCP servers occupy stdout
		overrideDefaultTransports: true,
		transports: {
			default: pino.transport({
				target: "pino-pretty",
				options: {
					destination: 2, // to stderr
					// pino-pretty options
					colorize: false,
					levelFirst: true,
					ignore: "pid,hostname",
					translateTime: "SYS:standard",
					singleLine: false,
				},
			}),
		},
	}),
});
