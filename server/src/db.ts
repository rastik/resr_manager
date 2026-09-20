import { Pool, types } from 'pg';
import path from 'path';
import dotenv from 'dotenv';
import { supabase } from './supabaseClient';

// Load .env from cwd, server directory, and project root
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Prevent node-postgres from shifting DATE values to UTC midnight ISO strings
types.setTypeParser(1082, (val: string) => val);

const connectionString = process.env.DATABASE_URL;

export const pool = new Pool(
  connectionString
    ? {
        connectionString,
        ssl: connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
          ? false
          : { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 3000,
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'resr',
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      }
);

pool.on('error', (err) => {
  console.warn('PostgreSQL pool connection notice (fallback to Supabase Cloud active):', err.message);
});

// Helper to convert snake_case object keys to camelCase
export function toCamelCase<T = any>(obj: any): T {
  if (Array.isArray(obj)) {
    return obj.map(v => toCamelCase(v)) as any;
  } else if (obj !== null && typeof obj === 'object' && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      let camelKey = key.replace(/_([a-z0-9])/g, (_, letter) => letter.toUpperCase());
      if (key === 'has_ac') camelKey = 'hasAC';
      result[camelKey] = toCamelCase(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
}

// Helper to convert camelCase object keys to snake_case
export function toSnakeCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(v => toSnakeCase(v));
  } else if (obj !== null && typeof obj === 'object' && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      let snakeKey = key;
      if (key === 'hasAC') {
        snakeKey = 'has_ac';
      } else {
        snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      }
      result[snakeKey] = toSnakeCase(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
}

export { supabase };
