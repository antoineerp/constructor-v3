import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;

const connectionString = process.env.DATABASE_URL;
if(!connectionString) {
  console.warn('[db] DATABASE_URL non défini – drizzle client créé en mode dégradé.');
}

const pool = connectionString ? new Pool({ connectionString, max: 5 }) : null;
export const db = pool ? drizzle(pool) : (new Proxy({}, {
  get(){ throw new Error('db indisponible: définir DATABASE_URL'); }
}) as any);
