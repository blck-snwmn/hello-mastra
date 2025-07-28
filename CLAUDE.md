# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Mastra-based application with two main features:
1. **Weather Service**: Retrieves weather information using Open-Meteo API and provides AI-powered activity suggestions via Google Gemini
2. **Ranka Chat Bot**: An AI agent embodying Ranka Oborozuki, a 200+ year old fox yokai character who runs an antique bookstore

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

### Run Tests
```bash
# Run all tests
pnpm test

# Run only evaluation tests
pnpm test:eval

# Note: Evaluation tests are automatically skipped in CI environments
```

## Architecture Overview

The application follows Mastra's agent-based architecture:

### Core Components (`src/mastra/`)

1. **Agents** (`agents/`): AI agents powered by Google Gemini
   - `weather-agent.ts`: Processes weather queries and generates activity suggestions
   - `ranka-agent.ts`: Embodies Ranka Oborozuki character with specific speech patterns

2. **Tools** (`tools/`): External API integrations
   - `weather-tool.ts`: Wraps Open-Meteo API for geocoding and weather data retrieval

3. **Workflows** (`workflows/`): Multi-step processing flows
   - `weather-workflow.ts`: Orchestrates city → weather → activity suggestion pipeline

4. **Evaluations** (`evals/`): Quality metrics for agents
   - `ranka-gobi-metric.ts`: Validates Ranka's speech patterns using NLP analysis

5. **Main Configuration** (`index.ts`): Initializes Mastra with all components

## Technical Requirements

- **Node.js**: >= 20.9.0
- **Module System**: ESM (ES Modules)
- **TypeScript**: ES2022 target with bundler module resolution
- **Environment Variables**: 
  - `GOOGLE_AI_API_KEY` (required in `.env` file)
- **Storage**: LibSQL (SQLite-based)
  - Default: `:memory:` (in-memory)
  - Persistent: Change to `file:../mastra.db` in `src/mastra/index.ts`

## Agent-Specific Guidelines

### Ranka Agent
When working with the Ranka agent:
- Character maintains specific speech patterns ending with だじぇ/のじぇ/じぇ
- Evaluation metrics check for:
  - Presence of required speech endings
  - Absence of modern expressions
  - Overall tone consistency
- Test with: `pnpm test:eval` to verify speech pattern compliance

### Weather Agent
- Uses structured tools for geocoding and weather data
- Responses should be concise and activity-focused
- Memory enabled for conversation context

## Important Notes

- Mastra CLI (`mastra`) handles build and development commands internally
- The project uses Google's Gemini 2.5 Pro experimental model
- All agents have memory capabilities for maintaining conversation history
- Evaluation tests provide quality assurance for agent behaviors