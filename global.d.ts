declare namespace NodeJS {
	interface ProcessEnv {
		readonly OPENROUTER_API_KEY: string;
		readonly TAVILY_API_KEY: string | undefined;
		readonly GITHUB_PERSONAL_ACCESS_TOKEN: string | undefined;
		readonly LIBDOCS_DEFAULT_AGENT_MODEL: string | undefined;
		readonly LIBDOCS_CONTEXT7_AGENT_MODEL: string | undefined;
		readonly LIBDOCS_DEEPWIKI_AGENT_MODEL: string | undefined;
		readonly LIBDOCS_WEB_SEARCH_AGENT_MODEL: string | undefined;
		readonly LIBDOCS_WEB_SEARCH_LIMIT: number | undefined;
	}
}
