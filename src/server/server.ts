import { serve } from 'bun'
import { handleRequest } from './handler/handle.js'
import * as Sentry from "@sentry/bun";

Sentry.init({
    dsn: "https://22298e3442bb4b4bc373cda39b07654c@o1204981.ingest.sentry.io/4506317199966208",
    // Performance Monitoring
    tracesSampleRate: 1.0, // Capture 100% of the transactions
});

const server = serve({ fetch: handleRequest })
console.log('🔥', server.port)
