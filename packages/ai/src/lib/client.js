import { OpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';

// Configuration du client OpenAI
const openai = new OpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: 'gpt-4o-mini',
  temperature: 0.3,
});

export { openai };