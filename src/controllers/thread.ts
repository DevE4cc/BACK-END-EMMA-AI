import { Req } from '../server/handler/handle';
import OpenAI from 'openai';

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
    const emptyThread = await openai.beta.threads.create();
    return emptyThread;
}

export default async function (req: Req) {
    // get API Key from Authorization header or environment variable
    const apiKey = getApiKey(req);

    // Create a thread
    const thread = await createThread(apiKey);
    console.log(thread);

    // Return the created thread details
    return thread;
}
