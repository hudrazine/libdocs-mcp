declare namespace NodeJS {
	interface ProcessEnv {
		readonly OPENROUTER_API_KEY: string;
		readonly LIBDOCS_AGENT_MODEL: string;
		readonly LIBDOCS_WEB_SEARCH_MODEL: string;
	}
}
