# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Mastra-based weather application that:
- Retrieves weather information for a given city using Open-Meteo API
- Uses Google Gemini AI to provide weather-based activity suggestions
- Maintains conversation history using LibSQL

## Development Commands

### Install Dependencies
```bash
pnpm install
```

### Run Development Server
```bash
pnpm dev
```

### Build Project
```bash
pnpm build
```

### Start Production Server
```bash
pnpm start
```

## Architecture Overview

The application follows Mastra's agent-based architecture:

1. **Agents** (`src/mastra/agents/`): AI agents that process natural language using Google Gemini
   - `weather-agent.ts`: Handles weather-related queries and generates activity suggestions

2. **Tools** (`src/mastra/tools/`): External API integrations wrapped as tools
   - `weather-tool.ts`: Interfaces with Open-Meteo API for geocoding and weather data

3. **Workflows** (`src/mastra/workflows/`): Step-based processing flows
   - `weather-workflow.ts`: Orchestrates the flow from city input → weather fetch → activity suggestion

4. **Main Configuration** (`src/mastra/index.ts`): Initializes Mastra with agents, workflows, storage, and logging

## Key Technical Details

- **TypeScript Configuration**: ES2022 target with bundler module resolution
- **Storage**: LibSQL (SQLite-based) - defaults to `:memory:`, can be changed to `file:../mastra.db` for persistence
- **Environment Variables**: Requires `GOOGLE_AI_API_KEY` in `.env` file
- **Node Version**: Requires Node.js >= 20.9.0

## Important Notes

- No test framework is currently set up (test script exits with error)
- The project uses ESM modules (`"type": "module"` in package.json)
- Mastra CLI (`mastra`) is used for development and build commands