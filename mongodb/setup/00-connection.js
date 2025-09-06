/**
 * MongoDB Connection Configuration
 * 
 * This script sets up the connection parameters for MongoDB Atlas.
 * Update the CONNECTION_STRING with your actual MongoDB Atlas connection string.
 * 
 * Usage: mongosh --file 00-connection.js
 */

// Configuration - UPDATE THESE VALUES
const CONFIG = {
  // MongoDB Atlas connection string
  CONNECTION_STRING: process.env.MONGODB_URI || 'mongodb+srv://<username>:<password>@<cluster>.mongodb.net/',
  
  // Database name
  DATABASE_NAME: process.env.DATABASE_NAME || 'sensorthings_datalake',
  
  // Connection options
  CONNECTION_OPTIONS: {
    retryWrites: true,
    w: 'majority',
    maxPoolSize: 10,
    minPoolSize: 5,
    maxIdleTimeMS: 10000,
    serverSelectionTimeoutMS: 5000,
  }
};

// Test connection function
async function testConnection() {
  try {
    print('Testing MongoDB connection...');
    
    // Connect to MongoDB
    const conn = new Mongo(CONFIG.CONNECTION_STRING);
    const adminDb = conn.getDB('admin');
    
    // Run ping command
    const result = adminDb.runCommand({ ping: 1 });
    
    if (result.ok === 1) {
      print('✅ Successfully connected to MongoDB!');
      
      // Get server info
      const serverStatus = adminDb.runCommand({ serverStatus: 1, repl: 0, metrics: 0 });
      print(`Server version: ${serverStatus.version}`);
      print(`Host: ${serverStatus.host}`);
      
      // Check if database exists
      const dbList = adminDb.runCommand({ listDatabases: 1 });
      const dbExists = dbList.databases.some(db => db.name === CONFIG.DATABASE_NAME);
      
      if (dbExists) {
        print(`✅ Database '${CONFIG.DATABASE_NAME}' exists`);
      } else {
        print(`⚠️  Database '${CONFIG.DATABASE_NAME}' does not exist yet (will be created on first write)`);
      }
      
      return true;
    } else {
      print('❌ Connection test failed');
      return false;
    }
  } catch (error) {
    print(`❌ Connection error: ${error.message}`);
    print('Please check your connection string and network access settings in MongoDB Atlas');
    return false;
  }
}

// Export configuration for use in other scripts
if (typeof module !== 'undefined') {
  module.exports = CONFIG;
}

// Run test if executed directly
if (typeof db !== 'undefined') {
  testConnection();
} else {
  print('Configuration loaded. Run with mongosh to test connection.');
}

// Helper function to get database connection
function getDatabase() {
  const conn = new Mongo(CONFIG.CONNECTION_STRING);
  return conn.getDB(CONFIG.DATABASE_NAME);
}

// Make config available globally for other scripts
globalThis.SENSORTHINGS_CONFIG = CONFIG;
globalThis.getSTDatabase = getDatabase;

print('Configuration loaded successfully');
print(`Database: ${CONFIG.DATABASE_NAME}`);
print('Run testConnection() to verify connectivity');
