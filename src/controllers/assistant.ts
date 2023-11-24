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

console.log(process.env.OPENAI_KEY);

// Instantiate the OpenAI client with the API key from the environment variable
const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });

async function createAssistant(apiKey: string) {
    const myAssistant = await openai.beta.assistants.create({
        instructions: "You are a personal math tutor. When asked a question, write and run Python code to answer the question.",
        name: "Math Tutor",
        tools: [{ type: "code_interpreter" }],
        model: "gpt-4",
    });

    return myAssistant;
}

export default async function (req: Req) {
    // get API Key from Authorization header or environment variable
    const apiKey = getApiKey(req);

    // Create an assistant
    const assistant = await createAssistant(apiKey);
    console.log(assistant);

    // Return the created assistant details
    return assistant;
}
