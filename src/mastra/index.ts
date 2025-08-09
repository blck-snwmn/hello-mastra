
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { weatherWorkflow } from './workflows/weather-workflow';
import { bookRecommendationWorkflow } from './workflows/book-recommendation-workflow';
import { dailyFortuneWorkflow } from './workflows/daily-fortune-workflow';
import { yokaiMysteryWorkflow } from './workflows/yokai-mystery-workflow';
import { soulBookFinderWorkflow } from './workflows/soul-book-finder-workflow';
import { weatherAgent } from './agents/weather-agent';
import { rankaAgent } from './agents/ranka-agent';

export const mastra = new Mastra({
  workflows: { 
    weatherWorkflow, 
    bookRecommendationWorkflow,
    dailyFortuneWorkflow,
    yokaiMysteryWorkflow,
    soulBookFinderWorkflow,
  },
  agents: { weatherAgent, rankaAgent },
  storage: new LibSQLStore({
    // stores telemetry, evals, ... into memory storage, if it needs to persist, change to file:../mastra.db
    url: ":memory:",
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
});
