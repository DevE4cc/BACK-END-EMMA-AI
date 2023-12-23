import { Req } from '../server/handler/handle';
import OpenAI from 'openai';
import * as Sentry from "@sentry/bun";
import { ThreadModel, IThread } from '../models/threadModel';

interface IThreadData {
    threadId: string;
    userStudent: string;
    platform: string;
    threadType: string;
}

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

        // Return the created thread details
        // console.log('Created thread:', emptyThread);

        return emptyThread;
    } catch (error) {
        // Log the error to Sentry
        Sentry.captureException(error);

        throw new Error(`Error creating thread: ${error}`);
    }
}

async function saveThreadToMongoDB(threadData: IThreadData): Promise<IThread> {
    try {
        return await ThreadModel.create(threadData);
    } catch (error) {
        Sentry.captureException(error);
        throw new Error(`Error saving thread to MongoDB: ${error}`);
    }
}
export default async function (req: Req): Promise<IThread> {
    try {
        const apiKey = getApiKey(req);
        const { userStudent, platform, threadType } = req.body;
        if (!userStudent) throw new Error('Missing userStudent');

        const emptyThread = await createThread(apiKey);
        const threadData: IThreadData = {
            threadId: emptyThread.id,
            userStudent,
            platform,
            threadType,
        };

        return await saveThreadToMongoDB(threadData);
    } catch (error) {
        Sentry.captureException(error);
        throw new Error('Internal Server Error');
    }
}