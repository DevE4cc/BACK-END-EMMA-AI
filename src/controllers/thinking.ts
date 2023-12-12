import { Post, Req } from '../server/handler/handle';
import OpenAI from 'openai';
import * as Sentry from "@sentry/bun";
import { ThreadModel } from '../models/threadModel';

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

// Function to update a thread with the runId
async function updateThreadWithRunId(threadId: string, runId: string) {
  try {
    // Get the date now to update the updatedAt field
    const now = new Date();
    await ThreadModel.updateOne(
      { threadId: threadId },
      {
        $push: { runId: runId },
        updatedAt: now
      }
    );
  } catch (error) {
    Sentry.captureException(error);
    throw new HTTPException(500, `Error updating thread with runId: ${error}`);
  }
}

async function runAssistant(threadId: string, assistantId: string) {
  try {

    console.log('Running assistant:', assistantId);
    const run = await openai.beta.threads.runs.create(
      threadId,
      {
        assistant_id: assistantId,
        instructions: "You're Emma, bilingual English Coach at E4CC. Always keep responses really short, focus on teaching English to Spanish speakers. Stay friendly and encouraging, avoid off-topic discussions.",
      }
    );
    console.log('Run created:', run);

    // Save the runId to the corresponding thread
    console.log('Updating thread with runId:', run.id);
    await updateThreadWithRunId(threadId, run.id);
    console.log('Thread updated');

    return run;
  } catch (error) {
    // Log the error to Sentry
    Sentry.captureException(error);

    throw new HTTPException(500, `Error in run_assistant: ${error}`);
  }
}

async function getStatus(threadId: string, runId: string) {
  try {
    console.log('Getting status for run:', runId);
    const run = await openai.beta.threads.runs.retrieve(threadId, runId);
    console.log('Run status:', run.status);
    return run.status;
  } catch (error) {
    // Log the error to Sentry
    Sentry.captureException(error);

    throw new HTTPException(500, `Error getting status: ${error}`);
  }
}

async function getMessages(threadId: string) {
  try {
    console.log('Getting messages from thread:', threadId);
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

    console.log('Latest message:', latestMessageText);
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

    // console.log('Creating message:', text);

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
