import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { ClassificationResultSchema, ClassificationResult } from '../types/ai';
import { OdysseyConfig } from '../types/config';
import { env } from '../config/env';
import pino from 'pino';

const logger = pino({ level: 'info' });

// Gemini Flash is chosen for low latency — classification is a single-turn task,
// so a lighter model is preferable over a more capable but slower one.
const model = new ChatGoogleGenerativeAI({
  model: 'gemini-1.5-flash',
  apiKey: env.GEMINI_API_KEY,
});

const stringParser = new StringOutputParser();

function buildClassifierPrompt(config: OdysseyConfig): string {
  const appList = Object.entries(config.apps)
    .map(([key, app]) => `  - "${key}": ${app.description}`)
    .join('\n');

  const appKeys = Object.keys(config.apps).join(', ');

  // The format instructions are baked into the prompt rather than using
  // LangChain's StructuredOutputParser to avoid version compatibility issues
  // with @langchain/google-genai's function-calling implementation.
  return `You are a message router for a personal WhatsApp assistant.
Classify the user's message to determine which app should handle it.

Available apps:
${appList}

Respond with ONLY a valid JSON object in this exact shape:
{
  "intent": "<snake_case description of what the user wants>",
  "app": "<one of: ${appKeys}>",
  "confidence": <0.0 to 1.0>,
  "raw_text": "<the original message>",
  "entities": { "<key>": "<value>" }
}

Extract relevant entities (e.g. task name, due date, URL). If none, use {}.
Do not include any text outside the JSON object.`;
}

export async function classifyMessage(
  text: string,
  config: OdysseyConfig
): Promise<ClassificationResult> {
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', buildClassifierPrompt(config)],
    ['human', '{message}'],
  ]);

  const chain = prompt.pipe(model).pipe(stringParser);
  const raw = await chain.invoke({ message: text });

  // Strip markdown code fences if the model wraps its output — it sometimes does
  // even when explicitly told not to.
  const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

  const parsed: unknown = JSON.parse(cleaned);
  const result = ClassificationResultSchema.safeParse(parsed);

  if (!result.success) {
    logger.error({ raw, error: result.error.message }, 'AI output failed Zod validation');
    throw new Error(`Invalid AI classification output: ${result.error.message}`);
  }

  return result.data;
}

// When routing confidence is too low, attempt a direct answer before giving up.
// This handles general questions (e.g. "what's 2+2?") without forcing the user to rephrase.
export async function answerDirectly(text: string): Promise<string | null> {
  try {
    const response = await model.invoke([['human', text]]);
    const content = response.content;
    if (typeof content === 'string' && content.trim()) {
      return content.trim();
    }
    return null;
  } catch (err) {
    logger.error({ err }, 'Direct Gemini answer failed');
    return null;
  }
}
