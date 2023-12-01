import { Req } from '../server/handler/handle';
import * as Sentry from "@sentry/bun";

export default async function (req: Req) {
    try {
        throw new Error('Sentry Bun test');
    } catch (e) {
        Sentry.captureException(e);
    }
}
