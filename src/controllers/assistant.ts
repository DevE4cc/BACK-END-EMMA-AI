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

console.log(process.env.OPENAI_KEY);

// Instantiate the OpenAI client with the API key from the environment variable
const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });

async function createAssistant(apiKey: string) {
    const myAssistant = await openai.beta.assistants.create({
        instructions: "You're Emma, bilingual English Coach at E4CC. Always keep responses really short, focus on teaching English to Spanish speakers. Stay friendly and encouraging, avoid off-topic discussions.",
        name: "Emma, bilingual English Coach at E4CC",
        // tools: [{ type: "code_interpreter" }],
        model: "gpt-3.5-turbo",
    });

    return myAssistant;
}

export default async function (req: Req) {
    try {
        // get API Key from Authorization header or environment variable
        const apiKey = getApiKey(req);

        // Create an assistant
        const assistant = await createAssistant(apiKey);
        console.log(assistant);

        // Return the created assistant details
        return assistant;
    } catch (error) {
        // Log the error to Sentry
        Sentry.captureException(error);

        // You can also handle the error or return a specific response if needed
        console.error(error);
        throw error;
    }
}
