# LibDocs MCP Server

[![NPM Version](https://img.shields.io/npm/v/libdocs-mcp?color=blue)](https://www.npmjs.com/package/libdocs-mcp)
[![Node Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue)](https://www.typescriptlang.org/)

Multi‑agent MCP server that keeps your LLM focused by returning only the documentation, repository insights, and web intelligence each query truly needs.

LibDocs inserts three specialized retrieval and reasoning agents between your coding assistant and external knowledge sources (Context7 documentation, DeepWiki repository analysis, and real‑time web research via Tavily). Each agent filters aggressively for relevance, structures results, and minimizes token overhead—improving information purity, lowering cost and latency variance, and sustaining longer productive sessions.

## ✨ Features

- Smart Documentation Lookup (Context7)

  - Relevance‑first filtering and summarization
  - Library resolution with cache and version awareness
  - Token‑aware, structured results

- Intelligent Repository Analysis (DeepWiki)

  - Repo discovery and topic‑guided Q&A
  - Focused architecture and implementation insights
  - Clear partial/warning handling and retry logic

- Comprehensive Web Research (Tavily)
  - Strategic search → targeted fetch → structured synthesis
  - Source verification and recency checks
  - Ethical and quality safeguards

## 🚀 Installation

### Requirements

- Node.js >= 22.0.0
- OpenRouter API Key (**Required**)
- Tavily API Key (Optional, for web research)
- GitHub Personal Access Token (Optional, improves rate limits)

### Setup Steps

1. **Open your MCP configuration file:**

   Locate and open your MCP client's configuration file. This is typically found in your user's configuration directory as `mcp.json` or similar. Check your MCP client's documentation for the exact location and method to access the configuration file.

2. **Add the server configuration:**

   ```json
   {
     "mcpServers": {
       "libdocs": {
         "command": "npx",
         "args": ["-y", "libdocs-mcp@latest"],
         "env": {
           "OPENROUTER_API_KEY": "your-openrouter-api-key",
           "TAVILY_API_KEY": "your-tavily-api-key",
           "GITHUB_PERSONAL_ACCESS_TOKEN": "your-github-token"
         }
       }
     }
   }
   ```

### Advanced Configuration

Customize behavior with environment variables:

- `LIBDOCS_DEFAULT_AGENT_MODEL`: Default AI model for all agents (default: x-ai/grok-code-fast-1)
- `LIBDOCS_CONTEXT7_AGENT_MODEL`: AI model for library documentation agent
- `LIBDOCS_DEEPWIKI_AGENT_MODEL`: AI model for GitHub analysis agent
- `LIBDOCS_WEB_SEARCH_AGENT_MODEL`: AI model for web research agent
- `LIBDOCS_WEB_SEARCH_LIMIT`: Max web search results (1-20, default: 10)

## 📖 Usage

### Quick Examples

Library docs (library_docs_lookup)

- "React Router v6 migration guide — return only breaking changes and upgrade examples. Exclude unrelated content."
- "Express.js v4.18 middleware API — focus on app.use and error-handling patterns with short examples."

GitHub repo analysis (github_repo_analyzer)

- "Analyze vuejs/vue reactivity: outline core modules, dependency graph, typical data flow, and key files. Provide implementation insights based on DeepWiki."
- "Find a popular React state management repo (search: 'react state management recoil zustand jotai'), choose the best candidate, explain the architecture, and list key modules. Include stars/description from discovery."

Web research (web_research_assistant)

- "Compare Next.js vs SvelteKit in 2025 for SSR performance, DX, and ecosystem. Use sources from the last 3 months and cite each source."
- "Troubleshoot 'pnpm install' network errors on Ubuntu 24.04 — compile the top 3 actionable fixes with links to official docs or reputable sources and include publication dates."

## 🛠️ Tools

### `library_docs_lookup`

Provides official documentation retrieval for libraries and frameworks with relevance-first filtering.

**Inputs:**

- `prompt` (string, required): Library name/version and specific documentation query
  - Examples: "React Router v6 migration guide", "express v4.18 middleware API — focus on app.use and error handling"

### `github_repo_analyzer`

Provides AI-powered analysis of GitHub repositories, explaining architecture and implementation patterns.

**Inputs:**

- `prompt` (string, required): Repository in owner/repo format or discovery query plus technical question
  - Examples: "facebook/react component lifecycle implementation", "react state management repos — compare architecture"

### `web_research_assistant`

Conducts comprehensive web research across multiple sources with structured synthesis.

**Inputs:**

- `prompt` (string, required): Research topic requiring broad web coverage
  - Examples: "Compare Next.js vs SvelteKit in 2025", "Ubuntu 24.04 pnpm install network errors — top fixes"

## 🧠 Agent Details

### Context7 Agent (Smart Documentation Lookup)

- Background
  - Context7’s default large token retrieval can overfill LLM context windows and include low‑relevance content. The agent sits between your coding agent and Context7 to deliver only what the query needs.
- Workflow
  - Library ID resolution with cache (prefers exact name → trust score → snippet count); version‑aware
  - Focused retrieval with a single retry on failure
  - Structured output with source attribution and consistent success/partial/error formats
  - Token‑aware memory limits to prevent runaway accumulation
- Error handling
  - Clear messages for not found, multiple matches (selection rationale), retrieval failures (single retry), and partial content warnings

### DeepWiki Agent (Intelligent Repository Analysis)

- Background
  - Helps target the right repo and topics, then synthesizes focused insights without flooding the context window.
- Workflow
  - Repository discovery with cache (when owner/repo not provided) using stars/relevance/non‑fork criteria
  - Documentation structure discovery via DeepWiki and topic mapping
  - Targeted question formulation and single‑retry retrieval
  - Structured Markdown output with repository attribution and partial/warning handling
- Error handling
  - Explicit errors for discovery, availability, and structure retrieval; graceful partial results

### Web Research Agent (Comprehensive Web Research)

- Background
  - Provides up‑to‑date findings from the open web while minimizing context usage.
- Workflow
  - Broad‑to‑narrow searches (concise queries), `web_fetch` deep dives, documented search trail
  - Structured synthesis: Executive Summary → Key Findings (with citations) → Detailed Analysis → Source Quality Notes → Further Investigation
  - Quality and ethics: short quotes, neutrality, privacy safeguards, self‑verification checklist
- Error handling
  - Clear notes on uncertainty/conflicts, and explicit partial‑coverage warnings

## 🔧 Troubleshooting

### Missing OPENROUTER_API_KEY

**Solution**: Add your OpenRouter API key to the MCP configuration's `env` section.

### Web research not working

**Solution**: Add `TAVILY_API_KEY` to your MCP configuration.

## 🔗 Links

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [OpenRouter](https://openrouter.ai/)
- [Context7](https://context7.com/)
- [DeepWiki](https://deepwiki.com/)
- [Tavily](https://tavily.com/)

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.
