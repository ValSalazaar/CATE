// db/index.js
import pg from "pg";
import { config } from "../config/env.js";

export const pool = new pg.Pool({ 
  connectionString: config.db.url,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Utility function for queries
export const q = (text, params) => pool.query(text, params);

// Test database connection
export async function testConnection() {
  try {
    const result = await q('SELECT NOW()');
    console.log('✅ Database connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

// Initialize database tables
export async function initDatabase() {
  try {
    // Read and execute migration
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    const migrationPath = path.join(__dirname, '../migrations/001_create_vc_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    await q(migrationSQL);
    console.log('✅ Database tables initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    return false;
  }
}

// Health check
export async function healthCheck() {
  try {
    const result = await q('SELECT COUNT(*) FROM app_user');
    return { 
      status: 'healthy', 
      userCount: parseInt(result.rows[0].count),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return { 
      status: 'unhealthy', 
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}
