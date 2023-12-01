import { Post, Req } from '../server/handler/handle';
import OpenAI from 'openai';
import * as Sentry from "@sentry/bun";

class HTTPException extends Error {
  status: number;
  message: string;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.message = message;
    Object.setPrototypeOf(this, HTTPException.prototype);
  }
}

function getApiKey(req: Req) {
  if (process.env.OPENAI_KEY) {
    return process.env.OPENAI_KEY;
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) throw new HTTPException(401, 'Missing API key');
  const apiKey = authHeader.split(' ')[1];
  if (!apiKey) throw new HTTPException(401, 'Wrong API key');
  return apiKey;
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });

async function runAssistant(threadId: string, assistantId: string) {
  try {
    const run = await openai.beta.threads.runs.create(
      threadId,
      {
        assistant_id: assistantId,
        instructions: "You're Emma, bilingual English Coach at E4CC. Always keep responses really short, focus on teaching English to Spanish speakers. Stay friendly and encouraging, avoid off-topic discussions.",
      }
    );
    return run;
  } catch (error) {
    // Log the error to Sentry
    Sentry.captureException(error);

    throw new HTTPException(500, `Error in run_assistant: ${error}`);
  }
}

async function getStatus(threadId: string, runId: string) {
  try {
    const run = await openai.beta.threads.runs.retrieve(threadId, runId);
    return run.status;
  } catch (error) {
    // Log the error to Sentry
    Sentry.captureException(error);

    throw new HTTPException(500, `Error getting status: ${error}`);
  }
}

async function getMessages(threadId: string) {
  try {
    const response = await openai.beta.threads.messages.list(threadId);

    if (!response.data || response.data.length === 0) {
      throw new HTTPException(404, 'No messages found in the thread');
    }

    // Find the latest message from the assistant
    const latestAssistantMessage = response.data.find(message => message.role === 'assistant');

    if (!latestAssistantMessage) {
      throw new HTTPException(404, 'No assistant messages found in the thread');
    }

    // Extract the text from the latest assistant's message
    const latestMessageText = latestAssistantMessage.content
      .filter(content => content.type === 'text')
      .map(textContent => {
        if (textContent.type === 'text') {
          return textContent.text.value;
        }
        return '';
      })
      .join('\n');

    return latestMessageText;

  } catch (error) {
    // Log the error to Sentry
    Sentry.captureException(error);

    throw new HTTPException(500, `Error getting messages: ${error}`);
  }
}

export default async function (req: Post<{ text: string; assistantId: string; threadId: string }>) {

  try {
    const apiKey = getApiKey(req);
    const { text, assistantId, threadId } = req.body; // Assuming req.body has these fields

    await openai.beta.threads.messages.create(
      threadId,
      {
        role: 'user',
        content: text,
      });

    const runResult = await runAssistant(threadId, assistantId);
    const runId = runResult.id;
    let retries = 0;
    const maxRetries = 600;
    let statusResponse;

    while (retries < maxRetries) {
      statusResponse = await getStatus(threadId, runId);
      if (statusResponse === 'completed') {
        break;
      }
      // Implement exponential backoff logic
      retries++;
    }

    if (retries === maxRetries) {
      throw new HTTPException(408, 'Request timed out');
    }

    const latestMessageText = await getMessages(threadId);
    return latestMessageText;

  } catch (error) {
    if (error instanceof HTTPException) {
      // Handle known HTTP exceptions
      throw error;
    } else {
      // Log the error to Sentry
      Sentry.captureException(error);

      // Handle unknown errors
      console.error('Unexpected error:', error);
      throw new HTTPException(500, 'Internal Server Error');
    }
  }
}
