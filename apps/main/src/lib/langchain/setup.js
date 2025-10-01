import { OpenAI } from 'langchain/llms/openai';
import { PromptTemplate } from 'langchain/prompts';
import { LLMChain } from 'langchain/chains';

// Configuration de base pour LangChain
const openAIModel = new OpenAI({
  modelName: 'gpt-4o-mini',
  temperature: 0.7,
  openAIApiKey: process.env.OPENAI_API_KEY, // Assurez-vous que cette clé est définie dans vos variables d'environnement
});

// Exemple de template de prompt
const prompt = new PromptTemplate({
  template: 'Écris un résumé pour : {topic}',
  inputVariables: ['topic'],
});

// Exemple de chaîne LangChain
const chain = new LLMChain({
  llm: openAIModel,
  prompt: prompt,
});

export { chain };