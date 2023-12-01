import * as Sentry from "@sentry/bun";

export default async function ping() {
    try {
        return Date.now();
    } catch (e) {
        Sentry.captureException(e);
    }
}