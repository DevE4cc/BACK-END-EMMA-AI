import { Post } from '../server/handler/handle';
import { UserModel } from '../models/userModel';
import * as Sentry from "@sentry/bun";

// Define the type for the request body
interface RegisterUserRequest {
    username: string;
    email: string;
    password: string;
    fullName?: string;
    bio?: string;
    profilePicture?: string;
}


async function hashPassword(password: string): Promise<string> {
    // Use argon2 as the default algorithm
    return Bun.password.hash(password, {
        algorithm: "argon2id", // "argon2id" | "argon2i" | "argon2d"
        memoryCost: 4, // memory usage in kibibytes
        timeCost: 2, // the number of iterations
    });
}

async function emailExists(email: string) {
    try {
        console.log('Checking if email exists:', email);

        // Use lean() to get a plain JavaScript object instead of a mongoose document
        const existingUser = await UserModel.findOne({ email }).lean();

        if (existingUser) {
            console.log('Email exists:', email);
            return true;
        } else {
            console.log('Email does not exist:', email);
            return false;
        }
    } catch (error: any) {
        // Log the error to Sentry
        Sentry.captureException(error);

        console.error('Error checking if email exists:', error.message);
        throw new Error('Error checking if email exists');
    }
}

export default async function (req: Post<RegisterUserRequest>) {
    try {
        const { username, email, password, fullName, bio, profilePicture }: RegisterUserRequest = req.body;

        if (!username || !email || !password) {
            throw new Error('Missing required fields for registration');
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new Error('Invalid email format');
        }

        // Validate password length
        if (password.length < 7) {
            throw new Error('Password must be at least 7 characters long');
        }

        // await connectToDatabase();

        // Check if email already exists
        const emailAlreadyExists = await emailExists(email);
        if (emailAlreadyExists) {
            console.log('Email already exists:', email);
            // await disconnectFromDatabase();
            return {
                status: 'error',
                message: 'Email already exists',
            };
        }

        // Hash the password using Bun password hasher
        const hashedPassword = await hashPassword(password);

        const newUser = new UserModel({
            username,
            email,
            password: hashedPassword,
            fullName,
            bio,
            profilePicture,
            createdAt: new Date(),
            updatedAt: new Date(),
            roles: ['user'],  // Default role for a registered user
            isActive: true,    // Default user is active
        });

        await newUser.save();

        console.log('User registered:', newUser);


        return {
            status: 'success',
            message: 'User registered successfully',
            user: newUser,
        };
    } catch (error: any) {
        // Log the error to Sentry
        Sentry.captureException(error);

        console.error('Registration error:', error);
        return {
            status: 'error',
            message: 'Error registering user',
            error: error.message,
        };
    }
}
