import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { ClassificationResultSchema, ClassificationResult } from '../types/ai';
import { OdysseyConfig } from '../types/config';
import { env } from '../config/env';
import pino from 'pino';

const logger = pino({ level: 'info' });

const model = new ChatGoogleGenerativeAI({
  model: 'gemini-2.5-flash',
  apiKey: env.GEMINI_API_KEY,
});

const stringParser = new StringOutputParser();

function buildClassifierPrompt(config: OdysseyConfig): string {
  const appList = Object.entries(config.apps)
    .map(([key, app]) => `  - "${key}": ${app.description}`)
    .join('\n');

  const appKeys = Object.keys(config.apps).join(', ');

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
  const systemPrompt = buildClassifierPrompt(config);
  logger.info({ text, appCount: Object.keys(config.apps).length }, 'classifyMessage: invoking model');

  // Use message objects directly — avoids LangChain's f-string template parser
  // which breaks on literal { } in the system prompt JSON example.
  const raw = await model.pipe(stringParser).invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(text),
  ]);

  logger.info({ raw }, 'classifyMessage: raw model output');

  const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  logger.info({ cleaned }, 'classifyMessage: cleaned output');

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    logger.error({ cleaned, err: e }, 'classifyMessage: JSON parse failed');
    throw new Error(`AI returned non-JSON output: ${cleaned}`);
  }

  const result = ClassificationResultSchema.safeParse(parsed);
  if (!result.success) {
    logger.error({ parsed, error: result.error.message }, 'classifyMessage: Zod validation failed');
    throw new Error(`Invalid AI classification output: ${result.error.message}`);
  }

  logger.info({ intent: result.data.intent, app: result.data.app, confidence: result.data.confidence }, 'classifyMessage: success');
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
