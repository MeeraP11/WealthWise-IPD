import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import * as schema from '../shared/schema';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set');
}

async function main() {
  console.log('Creating database schema...');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });
  
  // Create all tables directly using the schema definitions
  try {
    await pool.query(`
      DO $$ 
      BEGIN
        -- Create enums if they don't exist
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'expense_status') THEN
          CREATE TYPE expense_status AS ENUM ('necessary', 'avoidable', 'unnecessary');
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_mode') THEN
          CREATE TYPE payment_mode AS ENUM ('upi', 'debit_card', 'credit_card', 'cash', 'wallet');
        END IF;
      END $$;
    `);
    
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        coins INTEGER NOT NULL DEFAULT 0,
        streak INTEGER NOT NULL DEFAULT 0,
        last_login TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Create expenses table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        name TEXT NOT NULL,
        amount INTEGER NOT NULL,
        date TIMESTAMP NOT NULL DEFAULT NOW(),
        status expense_status NOT NULL,
        category TEXT NOT NULL,
        payment_mode payment_mode NOT NULL,
        notes TEXT
      );
    `);
    
    // Create savings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS savings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        amount INTEGER NOT NULL,
        date TIMESTAMP NOT NULL DEFAULT NOW(),
        source TEXT NOT NULL,
        notes TEXT
      );
    `);
    
    // Create goals table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS goals (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        name TEXT NOT NULL,
        target_amount INTEGER NOT NULL,
        current_amount INTEGER NOT NULL DEFAULT 0,
        start_date TIMESTAMP NOT NULL DEFAULT NOW(),
        target_date TIMESTAMP NOT NULL,
        completed BOOLEAN NOT NULL DEFAULT FALSE
      );
    `);
    
    // Create achievements table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS achievements (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        date TIMESTAMP NOT NULL DEFAULT NOW(),
        coins_awarded INTEGER NOT NULL DEFAULT 0
      );
    `);
    
    // Create predictions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS predictions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        month TEXT NOT NULL,
        predicted_amount INTEGER NOT NULL,
        actual_amount INTEGER,
        categories JSONB NOT NULL
      );
    `);
    
    console.log('Schema created successfully!');
    
    // Insert default demo user if not exists
    await pool.query(`
      INSERT INTO users (username, password, name, coins, streak, last_login)
      VALUES ('demo', 'password', 'Rahul Kumar', 750, 4, NOW())
      ON CONFLICT (username) DO NOTHING;
    `);
    
    console.log('Default user created if it didn\'t exist.');
    
  } catch (error) {
    console.error('Error creating schema:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);