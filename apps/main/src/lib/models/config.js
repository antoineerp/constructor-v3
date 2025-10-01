import { OpenAI } from 'langchain/llms/openai';
import { Mistral } from 'langchain/llms/mistral'; // Hypothèse : un connecteur Mistral existe

// Configuration des modèles disponibles
const models = {
  openai: new OpenAI({
    modelName: 'gpt-4o-mini',
    temperature: 0.7,
    openAIApiKey: process.env.OPENAI_API_KEY,
  }),
  mistral: new Mistral({
    modelName: 'mistral-7b',
    temperature: 0.7,
    mistralApiKey: process.env.MISTRAL_API_KEY, // Assurez-vous que cette clé est définie
  }),
};

export default models;