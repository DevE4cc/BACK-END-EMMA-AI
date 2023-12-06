import { Post } from '../server/handler/handle';
import { UserModel } from '../models/userModel';
import * as Sentry from "@sentry/bun";

async function findUserByEmail(email: string) {
    try {
        console.log('Finding user by email:', email);

        const user = await UserModel.findOne({ email });
        return user;
    } catch (error: any) {
        // Log the error to Sentry
        Sentry.captureException(error);

        console.error('Error finding user by email:', error.message);
        throw new Error('Error finding user by email');
    }
}

async function verifyPassword(candidatePassword: string, hashedPassword: string): Promise<boolean> {
    return Bun.password.verify(candidatePassword, hashedPassword);
}

export default async function (req: Post<{ email: string; password: string }>) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            throw new Error('Missing required fields for login');
        }

        // Find user by email
        const user = await findUserByEmail(email);

        if (!user) {
            console.log('User not found:', email);
            return {
                status: 'error',
                message: 'User not found',
            };
        }

        // Validate password using Bun password hasher
        const passwordMatch = await verifyPassword(password, user.password);

        if (!passwordMatch) {
            console.log('Incorrect password for user:', email);
            return {
                status: 'error',
                message: 'Incorrect password',
            };
        }

        console.log('User logged in:', email);

        return {
            status: 'success',
            message: 'User logged in successfully',
            user,
        };
    } catch (error: any) {
        // Log the error to Sentry
        Sentry.captureException(error);

        console.error('Login error:', error);
        return {
            status: 'error',
            message: 'Error during login',
            error: error.message,
        };
    }
}
