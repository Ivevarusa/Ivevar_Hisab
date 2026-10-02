/**
 * Database and secret settings. They can be set by hand (DATABASE_URL, AUTH_SECRET) or filled in
 * automatically by Vercel's Supabase integration (POSTGRES_PRISMA_URL, SUPABASE_JWT_SECRET).
 */
export const databaseUrl = () => process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL;

export const authSecret = () => process.env.AUTH_SECRET || process.env.SUPABASE_JWT_SECRET;
