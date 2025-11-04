import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { Pool as PgPool } from 'pg';
import { drizzle as neonDrizzle } from 'drizzle-orm/neon-serverless';
import { drizzle as pgDrizzle } from 'drizzle-orm/node-postgres';
import ws from "ws";
import * as schema from "@shared/schema";
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { NeonDatabase } from 'drizzle-orm/neon-serverless';

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const databaseUrl = process.env.DATABASE_URL;

const isNeonDatabase = databaseUrl.includes('neon.tech') || 
                       databaseUrl.includes('.pooler.neon') ||
                       databaseUrl.includes('neon.database.windows.net');

let pool: NeonPool | PgPool;
let db: NodePgDatabase<typeof schema> | NeonDatabase<typeof schema>;

if (isNeonDatabase) {
  neonConfig.webSocketConstructor = ws;
  pool = new NeonPool({ connectionString: databaseUrl });
  db = neonDrizzle({ client: pool, schema });
} else {
  pool = new PgPool({ connectionString: databaseUrl });
  db = pgDrizzle({ client: pool, schema });
}

export { pool, db };
