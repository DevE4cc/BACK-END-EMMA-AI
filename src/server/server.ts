import { serve } from 'bun'
import { handleRequest } from './handler/handle.js'
import * as Sentry from "@sentry/bun";
import * as mongoose from 'mongoose';
import { config } from './config';
import winston from 'winston';

// Initialize Winston logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.simple(),
    transports: [new winston.transports.Console()],
});

// Initialize Sentry
Sentry.init({
    dsn: "https://22298e3442bb4b4bc373cda39b07654c@o1204981.ingest.sentry.io/4506317199966208",
    // Performance Monitoring
    tracesSampleRate: 1.0, // Capture 100% of the transactions
});

async function connectToDatabase() {
    try {
        await mongoose.connect(config.MONGODB_URI, { maxPoolSize: 10, socketTimeoutMS: 20000 });
        logger.info('Mongoose connected to database');
    } catch (error) {
        // Log the error to Sentry
        Sentry.captureException(error);

        logger.error(`Mongoose connection error: ${error}`);
    }
}

try {
    // Establish a connection to MongoDB
    await connectToDatabase();
    console.log('Connected to MongoDB');

    const server = serve({
        // development: true,
        fetch: handleRequest
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
        try {
            // Close MongoDB connection
            await mongoose.connection.close();
            logger.info('Mongoose connection closed');
            process.exit(0);
        } catch (error) {
            logger.error('Error closing Mongoose connection:', error);
            process.exit(1);
        }
    });

    console.log('🔥', server.port);
} catch (error) {
    console.error('Server initialization error:', error);
    process.exit(1); // Exit the process with an error code
}