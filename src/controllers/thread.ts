import { Req } from '../server/handler/handle';
import OpenAI from 'openai';
import * as Sentry from "@sentry/bun";

function getApiKey(req: Req) {
    if (process.env.OPENAI_KEY) {
        return process.env.OPENAI_KEY;
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing API key');
    const apiKey = authHeader.split(' ')[1];
    if (!apiKey) throw new Error('Wrong API key');
    return apiKey;
}

// Instantiate the OpenAI client with the API key from the environment variable
const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });

async function createThread(apiKey: string) {
    try {
        const emptyThread = await openai.beta.threads.create();
        return emptyThread;
    } catch (error) {
        // Log the error to Sentry
        Sentry.captureException(error);

        throw new Error(`Error creating thread: ${error}`);
    }
}

export default async function (req: Req) {
    try {
        // get API Key from Authorization header or environment variable
        const apiKey = getApiKey(req);

        // Create a thread
        const thread = await createThread(apiKey);
        console.log(thread);

        // Return the created thread details
        return thread;
    } catch (error) {
        // Log the error to Sentry
        Sentry.captureException(error);

        // Handle unknown errors
        console.error('Unexpected error:', error);
        throw new Error('Internal Server Error');
    }
}
