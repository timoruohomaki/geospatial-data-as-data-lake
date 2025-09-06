/**
 * Database Creation and Initial Setup
 * 
 * This script creates the database and performs initial configuration.
 * Run after configuring connection in 00-connection.js
 * 
 * Usage: mongosh --file 01-create-database.js
 */

// Load connection configuration
load('00-connection.js');

async function createDatabase() {
  try {
    print('='.repeat(50));
    print('SensorThings Data Lake - Database Setup');
    print('='.repeat(50));
    
    // Connect to MongoDB
    const db = getSTDatabase();
    print(`\n📁 Setting up database: ${db.getName()}`);
    
    // Create a test collection to ensure database is created
    db.createCollection('_setup', {
      capped: false,
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['setupDate', 'version'],
          properties: {
            setupDate: {
              bsonType: 'date',
              description: 'Database setup date'
            },
            version: {
              bsonType: 'string',
              description: 'Schema version'
            }
          }
        }
      }
    });
    
    // Insert setup record
    db._setup.insertOne({
      setupDate: new Date(),
      version: '1.0.0',
      description: 'SensorThings API MongoDB Data Lake',
      specification: 'OGC SensorThings API v1.1',
      features: [
        'Time-series collections for observations',
        'OGC API Features integration',
        'UCUM ontology support',
        'Hierarchical spatial relationships'
      ]
    });
    
    print('✅ Database created successfully');
    
    // Set database metadata
    print('\n📝 Setting database metadata...');
    
    // Database validation rules
    const dbAdmin = db.getSiblingDB('admin');
    dbAdmin.runCommand({
      collMod: '__system',
      validationLevel: 'moderate',
      validationAction: 'warn'
    });
    
    // Get database statistics
    const stats = db.stats();
    print(`\nDatabase Statistics:`);
    print(`- Storage Size: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
    print(`- Collections: ${stats.collections}`);
    print(`- Indexes: ${stats.indexes}`);
    
    return true;
  } catch (error) {
    print(`❌ Error creating database: ${error.message}`);
    return false;
  }
}

// Create collections configuration
const COLLECTIONS_CONFIG = {
  // Time-series collection for observations
  observations: {
    type: 'timeseries',
    options: {
      timeseries: {
        timeField: 'phenomenonTime',
        metaField: 'datastream',
        granularity: 'seconds'
      },
      expireAfterSeconds: 31536000 // 1 year TTL (optional, remove if not needed)
    }
  },
  
  // Standard collections
  datastreams: { type: 'standard' },
  things: { type: 'standard' },
  sensors: { type: 'standard' },
  observed_properties: { type: 'standard' },
  locations: { type: 'standard' },
  historical_locations: { type: 'standard' },
  features_of_interest: { type: 'standard' },
  feature_associations: { type: 'standard' },
  external_feature_cache: { type: 'standard' },
  feature_hierarchies: { type: 'standard' },
  unit_of_measurement: { type: 'standard' },
  date_dimension: { type: 'standard' },
  hourly_aggregates: { type: 'standard' },
  daily_summaries: { type: 'standard' },
  
  // Enumeration collections
  observation_types: { type: 'standard' },
  encoding_types: { type: 'standard' },
  unit_hierarchy_cache: { type: 'standard' },
  unit_conversion_cache: { type: 'standard' }
};

// List all collections to be created
function listCollections() {
  print('\n📋 Collections to be created:');
  print('-'.repeat(40));
  
  Object.keys(COLLECTIONS_CONFIG).forEach((name, index) => {
    const config = COLLECTIONS_CONFIG[name];
    const type = config.type === 'timeseries' ? '⏱️  Time-Series' : '📄 Standard';
    print(`${(index + 1).toString().padStart(2, '0')}. ${name.padEnd(25)} ${type}`);
  });
  
  print('\nTotal collections: ' + Object.keys(COLLECTIONS_CONFIG).length);
}

// Validation function
function validateSetup() {
  const db = getSTDatabase();
  print('\n🔍 Validating database setup...');
  
  // Check if setup collection exists
  const setupExists = db.getCollectionNames().includes('_setup');
  if (setupExists) {
    const setup = db._setup.findOne();
    print(`✅ Database initialized on: ${setup.setupDate}`);
    print(`   Version: ${setup.version}`);
    return true;
  } else {
    print('⚠️  Database not initialized. Run createDatabase() first.');
    return false;
  }
}

// Main execution
if (typeof db !== 'undefined') {
  print('\n🚀 Starting database setup...\n');
  
  if (createDatabase()) {
    listCollections();
    validateSetup();
    print('\n✅ Database setup completed successfully!');
    print('\n📌 Next steps:');
    print('   1. Run 02-create-users.js to set up users and roles');
    print('   2. Run collection scripts in collections/ directory');
    print('   3. Run index scripts in indexes/ directory');
  } else {
    print('\n❌ Database setup failed. Please check the errors above.');
  }
} else {
  print('Please run this script with mongosh');
}
