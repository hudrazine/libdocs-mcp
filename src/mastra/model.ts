import { openrouter } from "./provider";

export const RECOMMENDED_DEFAULT_MODEL = openrouter("x-ai/grok-code-fast-1");

export const DEFAULT_AGENT_MODEL = process.env.LIBDOCS_DEFAULT_AGENT_MODEL
	? openrouter(process.env.LIBDOCS_DEFAULT_AGENT_MODEL)
	: RECOMMENDED_DEFAULT_MODEL;

export const CONTEXT7_AGENT_MODEL = process.env.LIBDOCS_CONTEXT7_AGENT_MODEL
	? openrouter(process.env.LIBDOCS_CONTEXT7_AGENT_MODEL)
	: DEFAULT_AGENT_MODEL;

export const DEEPWIKI_AGENT_MODEL = process.env.LIBDOCS_DEEPWIKI_AGENT_MODEL
	? openrouter(process.env.LIBDOCS_DEEPWIKI_AGENT_MODEL)
	: DEFAULT_AGENT_MODEL;

export const WEB_RESEARCH_MODEL = process.env.LIBDOCS_WEB_SEARCH_AGENT_MODEL
	? openrouter(process.env.LIBDOCS_WEB_SEARCH_AGENT_MODEL)
	: DEFAULT_AGENT_MODEL;
