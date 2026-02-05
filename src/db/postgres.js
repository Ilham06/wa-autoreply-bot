import pkg from 'pg';
import { env } from '../config/env.js';

const { Pool } = pkg;

export const pg = new Pool({
  connectionString: env.dbUrl
});

pg.on('connect', () => {
  console.log('🐘 Postgres connected');
});
