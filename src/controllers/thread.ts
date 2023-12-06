import { Req } from '../server/handler/handle';
import OpenAI from 'openai';
import * as Sentry from "@sentry/bun";
import { ThreadModel } from '../models/threadModel';

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
        // Create a thread in OpenAI
        const emptyThread = await openai.beta.threads.create();
        console.log(emptyThread);

        return emptyThread;
    } catch (error) {
        // Log the error to Sentry
        Sentry.captureException(error);

        throw new Error(`Error creating thread: ${error}`);
    }
}

export const saveThreadToMongoDB = async (emptyThread: any) => {
    try {
        // Save the thread details in MongoDB using Mongoose
        const threadData = {
            threadId: emptyThread.id,
            userId: '1', // Replace with the actual user ID
        };

        console.log('Saving thread to MongoDB:', threadData);

        const createdThread = await ThreadModel.create(threadData);

        return createdThread;
    } catch (error) {
        // Log the error to Sentry
        Sentry.captureException(error);

        throw new Error(`Error saving thread to MongoDB: ${error}`);
    }
};

export default async function (req: Req) {
    try {
        // get API Key from Authorization header or environment variable
        const apiKey = getApiKey(req);

        // Create a thread
        const emptyThread = await createThread(apiKey);
        console.log(emptyThread);

        // Save the thread to MongoDB
        const savedThread = await saveThreadToMongoDB(emptyThread);
        console.log(savedThread);

        // Return the created thread details
        return savedThread;
    } catch (error) {
        // Log the error to Sentry
        Sentry.captureException(error);

        // Handle unknown errors
        console.error('Unexpected error:', error);
        throw new Error('Internal Server Error');
    }
}
