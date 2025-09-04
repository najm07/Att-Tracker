import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

let db;

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function initDatabase() {
  console.log(__filename);
  // Ensure data directory exists
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Create database file path
  const dbPath = path.join(dataDir, 'attendance.db');
  console.log('📂 Database path:', dbPath);

  db = new Database(dbPath);

  // Resolve schema path
  const schemaPath = path.join(__dirname, 'schema.sql');
  console.log('📄 Schema path:', schemaPath);

  // Check schema file exists
  if (!fs.existsSync(schemaPath)) {
    console.error('❌ Schema file not found at:', schemaPath);
    process.exit(1);
  }

  // Read and execute schema
  const schema = fs.readFileSync(schemaPath, 'utf8');
  const statements = schema.split(';').filter(stmt => stmt.trim());

  statements.forEach(statement => {
    try {
      db.exec(statement);
    } catch (error) {
      console.error('⚠️ Error executing statement:', statement);
      console.error(error);
    }
  });

  console.log('✅ Database initialized successfully:', dbPath);
  return db;
}

function getDatabase() {
  if (!db) {
    db = initDatabase();
  }
  return db;
}

export { initDatabase, getDatabase };

