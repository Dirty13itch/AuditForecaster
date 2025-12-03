import 'dotenv/config';
import { z } from 'zod';

console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Unset');
console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL);
console.log('NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? 'Set' : 'Unset');
console.log('NEXT_PUBLIC_SENTRY_DSN:', process.env.NEXT_PUBLIC_SENTRY_DSN);

const envSchema = z.object({
    DATABASE_URL: z.string().url(),
    NEXTAUTH_URL: z.string().url(),
    NEXTAUTH_SECRET: z.string().min(32),
    NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
});

const data = {
    DATABASE_URL: process.env.DATABASE_URL,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
};

console.log('Data to validate:', JSON.stringify(data, null, 2));

const result = envSchema.safeParse(data);
if (!result.success) {
    console.error('Validation failed:', JSON.stringify(result.error.format(), null, 2));
} else {
    console.log('Validation passed!');
}
