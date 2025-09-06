/**
 * Observations Time-Series Collection
 * 
 * Creates the time-series collection for storing sensor observations.
 * This is the core fact table of the data lake.
 * 
 * Usage: mongosh --file 01-observations.js
 */

// Load connection configuration
load('../setup/00-connection.js');

const COLLECTION_NAME = 'observations';

// Collection schema definition
const COLLECTION_SCHEMA = {
  bsonType: 'object',
  required: ['phenomenonTime', 'result', 'datastream'],
  properties: {
    phenomenonTime: {
      bsonType: 'date',
      description: 'Time when the observation occurred'
    },
    datastream: {
      bsonType: 'object',
      required: ['datastreamId'],
      properties: {
        datastreamId: { bsonType: 'string' },
        thingId: { bsonType: 'string' },
        sensorId: { bsonType: 'string' },
        observedPropertyId: { bsonType: 'string' },
        locationId: { bsonType: 'string' },
        unitOfMeasurement: {
          bsonType: 'object',
          properties: {
            name: { bsonType: 'string' },
            symbol: { bsonType: 'string' },
            definition: { bsonType: 'string' }
          }
        }
      }
    },
    result: {
      bsonType: ['number', 'string', 'bool', 'object', 'array'],
      description: 'The observation result value'
    },
    resultTime: {
      bsonType: 'date',
      description: 'Time when the result was generated'
    },
    resultQuality: {
      bsonType: 'string',
      enum: ['good', 'bad', 'uncertain', 'missing'],
      description: 'Quality indicator for the observation'
    },
    validTime: {
      bsonType: 'object',
      properties: {
        start: { bsonType: 'date' },
        end: { bsonType: ['date', 'null'] }
      }
    },
    featureOfInterestId: {
      bsonType: 'string',
      description: 'Reference to the feature of interest'
    },
    parameters: {
      bsonType: 'object',
      description: 'Additional observation parameters'
    },
    date_key: {
      bsonType: 'int',
      description: 'Date dimension key (YYYYMMDD format)'
    },
    hour_bucket: {
      bsonType: 'int',
      minimum: 0,
      maximum: 23,
      description: 'Hour of the day for bucketing'
    },
    location: {
      bsonType: 'object',
      properties: {
        type: {
          bsonType: 'string',
          enum: ['Point', 'Polygon', 'LineString']
        },
        coordinates: {
          bsonType: 'array'
        }
      }
    }
  }
};

// Create the time-series collection
function createObservationsCollection() {
  const db = getSTDatabase();
  
  print(`\n📊 Creating Time-Series Collection: ${COLLECTION_NAME}`);
  print('='.repeat(50));
  
  try {
    // Check if collection already exists
    const collections = db.getCollectionNames();
    if (collections.includes(COLLECTION_NAME)) {
      print(`⚠️  Collection '${COLLECTION_NAME}' already exists`);
      
      // Get collection info
      const stats = db[COLLECTION_NAME].stats();
      print(`\nCollection Statistics:`);
      print(`  • Documents: ${stats.count}`);
      print(`  • Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      print(`  • Storage: ${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`);
      
      return false;
    }
    
    // Create time-series collection
    db.createCollection(COLLECTION_NAME, {
      timeseries: {
        timeField: 'phenomenonTime',
        metaField: 'datastream',
        granularity: 'seconds'
      },
      // Optional: Set TTL for automatic data expiration
      // expireAfterSeconds: 31536000, // 1 year
      
      // Validation rules
      validator: {
        $jsonSchema: COLLECTION_SCHEMA
      },
      validationLevel: 'moderate',
      validationAction: 'warn'
    });
    
    print(`✅ Time-series collection '${COLLECTION_NAME}' created successfully`);
    
    // Collection configuration details
    print(`\nConfiguration:`);
    print(`  • Type: Time-Series`);
    print(`  • Time Field: phenomenonTime`);
    print(`  • Meta Field: datastream`);
    print(`  • Granularity: seconds`);
    print(`  • Validation: Enabled (moderate level)`);
    
    return true;
    
  } catch (error) {
    print(`❌ Error creating collection: ${error.message}`);
    return false;
  }
}

// Create indexes for the collection
function createObservationsIndexes() {
  const db = getSTDatabase();
  
  print(`\n🔍 Creating indexes for ${COLLECTION_NAME}...`);
  
  const indexes = [
    // Compound index for datastream queries
    {
      keys: { 'datastream.datastreamId': 1, 'phenomenonTime': -1 },
      options: { 
        name: 'idx_datastream_time',
        background: true 
      }
    },
    // Thing-based queries
    {
      keys: { 'datastream.thingId': 1, 'phenomenonTime': -1 },
      options: { 
        name: 'idx_thing_time',
        background: true 
      }
    },
    // Property-based queries
    {
      keys: { 'datastream.observedPropertyId': 1, 'phenomenonTime': -1 },
      options: { 
        name: 'idx_property_time',
        background: true 
      }
    },
    // Feature of interest queries
    {
      keys: { 'featureOfInterestId': 1, 'phenomenonTime': -1 },
      options: { 
        name: 'idx_foi_time',
        background: true 
      }
    },
    // Date dimension queries
    {
      keys: { 'date_key': 1, 'datastream.datastreamId': 1 },
      options: { 
        name: 'idx_date_datastream',
        background: true 
      }
    },
    // Geospatial queries
    {
      keys: { 'location': '2dsphere' },
      options: { 
        name: 'idx_location_2dsphere',
        background: true,
        sparse: true 
      }
    },
    // Result quality filtering
    {
      keys: { 'resultQuality': 1 },
      options: { 
        name: 'idx_quality',
        background: true,
        sparse: true 
      }
    }
  ];
  
  indexes.forEach(index => {
    try {
      db[COLLECTION_NAME].createIndex(index.keys, index.options);
      print(`  ✅ Created index: ${index.options.name}`);
    } catch (error) {
      if (error.codeName === 'IndexAlreadyExists') {
        print(`  ⚠️  Index already exists: ${index.options.name}`);
      } else {
        print(`  ❌ Error creating index ${index.options.name}: ${error.message}`);
      }
    }
  });
}

// Insert sample data
function insertSampleData() {
  const db = getSTDatabase();
  
  print(`\n📝 Inserting sample data...`);
  
  const sampleObservations = [
    {
      phenomenonTime: new Date('2025-01-15T14:30:00.123Z'),
      datastream: {
        datastreamId: 'DS-001',
        thingId: 'THING-001',
        sensorId: 'SENSOR-001',
        observedPropertyId: 'PROP-001',
        locationId: 'LOC-001',
        unitOfMeasurement: {
          name: 'degree Celsius',
          symbol: '°C',
          definition: 'http://unitsofmeasure.org/ucum.html#para-30'
        }
      },
      result: 23.5,
      resultTime: new Date('2025-01-15T14:30:00.523Z'),
      resultQuality: 'good',
      validTime: {
        start: new Date('2025-01-15T14:30:00Z'),
        end: new Date('2025-01-15T15:30:00Z')
      },
      featureOfInterestId: 'FOI-001',
      parameters: {
        calibrationDate: new Date('2024-12-01'),
        accuracy: 0.1
      },
      date_key: 20250115,
      hour_bucket: 14,
      location: {
        type: 'Point',
        coordinates: [-114.133, 51.08]
      }
    },
    {
      phenomenonTime: new Date('2025-01-15T14:31:00.123Z'),
      datastream: {
        datastreamId: 'DS-001',
        thingId: 'THING-001',
        sensorId: 'SENSOR-001',
        observedPropertyId: 'PROP-001',
        locationId: 'LOC-001',
        unitOfMeasurement: {
          name: 'degree Celsius',
          symbol: '°C',
          definition: 'http://unitsofmeasure.org/ucum.html#para-30'
        }
      },
      result: 23.6,
      resultTime: new Date('2025-01-15T14:31:00.523Z'),
      resultQuality: 'good',
      featureOfInterestId: 'FOI-001',
      date_key: 20250115,
      hour_bucket: 14,
      location: {
        type: 'Point',
        coordinates: [-114.133, 51.08]
      }
    }
  ];
  
  try {
    const result = db[COLLECTION_NAME].insertMany(sampleObservations);
    print(`  ✅ Inserted ${result.insertedCount} sample observations`);
  } catch (error) {
    print(`  ⚠️  Could not insert sample data: ${error.message}`);
  }
}

// Main execution
if (typeof db !== 'undefined') {
  print('\n🚀 Setting up Observations Time-Series Collection\n');
  
  if (createObservationsCollection()) {
    createObservationsIndexes();
    insertSampleData();
    
    print('\n✅ Observations collection setup completed!');
    print('\n📊 Collection Features:');
    print('  • Automatic time-based bucketing for optimal storage');
    print('  • 90% storage reduction compared to standard collections');
    print('  • Optimized for time-range queries');
    print('  • Supports geospatial queries');
    print('  • Integrated with date dimension for analytics');
  } else {
    print('\n⚠️  Collection already exists. Skipping creation.');
    print('  Run index creation separately if needed.');
  }
} else {
  print('Please run this script with mongosh');
}
