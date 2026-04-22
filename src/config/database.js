import pkg from 'pg';
import { env } from './app.js';

const { Pool } = pkg;

export const pg = new Pool({
  connectionString: env.dbUrl
});

pg.on('connect', () => {
  console.log('🐘 Postgres connected');
});
