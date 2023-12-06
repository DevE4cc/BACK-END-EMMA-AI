import mongoose, { Document, Schema } from 'mongoose';

interface IThread extends Document {
    threadId: string;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
}

const threadSchema = new Schema<IThread>(
    {
        threadId: { type: String, required: true },
        userId: { type: String, required: true },
        createdAt: { type: Date, default: Date.now, required: true },
        updatedAt: { type: Date, default: Date.now, required: true },
    },
);

export const ThreadModel = mongoose.model<IThread>('Thread', threadSchema);
