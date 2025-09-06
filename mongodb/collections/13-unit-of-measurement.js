/**
 * Unit of Measurement Collection with UCUM Ontology
 * 
 * Creates the unit_of_measurement collection for caching
 * UCUM ontology data with hierarchical relationships.
 * 
 * Usage: mongosh --file 13-unit-of-measurement.js
 */

// Load connection configuration
load('../setup/00-connection.js');

const COLLECTION_NAME = 'unit_of_measurement';

// Collection schema definition
const COLLECTION_SCHEMA = {
  bsonType: 'object',
  required: ['uri', 'ucumCode'],
  properties: {
    uri: {
      bsonType: 'string',
      description: 'External ontology URI (e.g., http://urn.fi/URN:NBN:fi:au:ucum:r133)'
    },
    ucumCode: {
      bsonType: 'string',
      description: 'UCUM notation/code (e.g., atm)'
    },
    ucumCodeCaseSensitive: {
      bsonType: 'string',
      description: 'Case-sensitive variant'
    },
    labels: {
      bsonType: 'object',
      properties: {
        preferred: {
          bsonType: 'object',
          description: 'Preferred labels by language'
        },
        alternative: {
          bsonType: 'array',
          items: {
            bsonType: 'object',
            properties: {
              lang: { bsonType: 'string' },
              value: { bsonType: 'string' }
            }
          }
        }
      }
    },
    definition: {
      bsonType: 'object',
      description: 'Unit definition by language'
    },
    hierarchy: {
      bsonType: 'object',
      properties: {
        broader: {
          bsonType: 'array',
          items: {
            bsonType: 'object',
            properties: {
              uri: { bsonType: 'string' },
              ucumCode: { bsonType: 'string' },
              label: { bsonType: 'string' },
              level: { bsonType: 'int' }
            }
          }
        },
        narrower: {
          bsonType: 'array',
          items: {
            bsonType: 'object',
            properties: {
              uri: { bsonType: 'string' },
              ucumCode: { bsonType: 'string' },
              label: { bsonType: 'string' },
              level: { bsonType: 'int' }
            }
          }
        },
        broaderTransitive: {
          bsonType: 'array',
          items: { bsonType: 'string' },
          description: 'All ancestor URIs'
        },
        narrowerTransitive: {
          bsonType: 'array',
          items: { bsonType: 'string' },
          description: 'All descendant URIs'
        }
      }
    },
    conversion: {
      bsonType: 'object',
      properties: {
        toBaseUnit: {
          bsonType: 'object',
          properties: {
            factor: { bsonType: 'number' },
            baseUnitUri: { bsonType: 'string' },
            baseUnitCode: { bsonType: 'string' },
            operation: {
              bsonType: 'string',
              enum: ['multiply', 'divide', 'add', 'subtract']
            }
          }
        },
        formula: { bsonType: 'string' },
        isMetric: { bsonType: 'bool' }
      }
    },
    classification: {
      bsonType: 'object',
      properties: {
        dimension: {
          bsonType: 'string',
          description: 'Physical dimension (e.g., pressure, temperature)'
        },
        quantityKind: { bsonType: 'string' },
        system: {
          bsonType: 'string',
          enum: ['SI', 'SI-derived', 'imperial', 'US-customary', 'other']
        },
        categories: {
          bsonType: 'array',
          items: { bsonType: 'string' }
        },
        isBaseUnit: { bsonType: 'bool' },
        isArbitrary: { bsonType: 'bool' }
      }
    },
    iso80000: {
      bsonType: 'object',
      properties: {
        compliant: { bsonType: 'bool' },
        part: { bsonType: 'string' },
        section: { bsonType: 'string' },
        status: {
          bsonType: 'string',
          enum: ['accepted', 'deprecated', 'obsolete']
        },
        alternativeSymbols: {
          bsonType: 'array',
          items: { bsonType: 'string' }
        }
      }
    },
    metadata: {
      bsonType: 'object',
      properties: {
        fintoLastFetched: { bsonType: 'date' },
        fintoVersion: { bsonType: 'string' },
        cacheExpiry: { bsonType: 'date' },
        syncStatus: {
          bsonType: 'string',
          enum: ['current', 'stale', 'error']
        },
        lastModified: { bsonType: 'date' }
      }
    },
    sensorThings: {
      bsonType: 'object',
      properties: {
        observationCount: { bsonType: 'long' },
        datastreamCount: { bsonType: 'int' },
        lastUsed: { bsonType: 'date' },
        frequencyScore: { bsonType: 'number', minimum: 0, maximum: 1 }
      }
    }
  }
};

// Create the collection
function createUnitOfMeasurementCollection() {
  const db = getSTDatabase();
  
  print(`\n📐 Creating Collection: ${COLLECTION_NAME}`);
  print('='.repeat(50));
  
  try {
    // Check if collection already exists
    const collections = db.getCollectionNames();
    if (collections.includes(COLLECTION_NAME)) {
      print(`⚠️  Collection '${COLLECTION_NAME}' already exists`);
      
      const stats = db[COLLECTION_NAME].stats();
      print(`\nCollection Statistics:`);
      print(`  • Documents: ${stats.count}`);
      print(`  • Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      print(`  • Indexes: ${stats.nindexes}`);
      
      return false;
    }
    
    // Create collection with validation
    db.createCollection(COLLECTION_NAME, {
      validator: {
        $jsonSchema: COLLECTION_SCHEMA
      },
      validationLevel: 'moderate',
      validationAction: 'warn'
    });
    
    print(`✅ Collection '${COLLECTION_NAME}' created successfully`);
    
    return true;
    
  } catch (error) {
    print(`❌ Error creating collection: ${error.message}`);
    return false;
  }
}

// Create indexes
function createIndexes() {
  const db = getSTDatabase();
  
  print(`\n🔍 Creating indexes for ${COLLECTION_NAME}...`);
  
  const indexes = [
    // Primary lookup
    {
      keys: { uri: 1 },
      options: { 
        name: 'idx_uri',
        unique: true,
        background: true 
      }
    },
    // UCUM code lookup
    {
      keys: { ucumCode: 1 },
      options: { 
        name: 'idx_ucum_code',
        background: true 
      }
    },
    // Dimension classification
    {
      keys: { 'classification.dimension': 1 },
      options: { 
        name: 'idx_dimension',
        background: true 
      }
    },
    // Hierarchical queries
    {
      keys: { 'hierarchy.broaderTransitive': 1 },
      options: { 
        name: 'idx_broader_transitive',
        background: true 
      }
    },
    {
      keys: { 'hierarchy.narrowerTransitive': 1 },
      options: { 
        name: 'idx_narrower_transitive',
        background: true 
      }
    },
    // Usage optimization
    {
      keys: { 'sensorThings.frequencyScore': -1 },
      options: { 
        name: 'idx_frequency_score',
        background: true 
      }
    },
    // Compound index for dimension + base unit
    {
      keys: { 
        'classification.dimension': 1,
        'classification.isBaseUnit': 1 
      },
      options: { 
        name: 'idx_dimension_base',
        background: true 
      }
    },
    // Text search on labels
    {
      keys: { 
        'ucumCode': 'text',
        'labels.preferred.en': 'text' 
      },
      options: { 
        name: 'idx_text_search',
        background: true 
      }
    },
    // TTL index for cache expiry
    {
      keys: { 'metadata.cacheExpiry': 1 },
      options: { 
        name: 'idx_cache_expiry',
        expireAfterSeconds: 0,
        background: true 
      }
    },
    // ISO 80000 compliance
    {
      keys: { 'iso80000.compliant': 1 },
      options: { 
        name: 'idx_iso_compliant',
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

// Insert sample units
function insertSampleUnits() {
  const db = getSTDatabase();
  
  print(`\n📝 Inserting sample units of measurement...`);
  
  const sampleUnits = [
    {
      uri: 'http://urn.fi/URN:NBN:fi:au:ucum:r133',
      ucumCode: 'atm',
      ucumCodeCaseSensitive: 'ATM',
      labels: {
        preferred: {
          en: 'standard atmosphere',
          fi: 'normaali-ilmakehä'
        },
        alternative: [
          { lang: 'en', value: 'atmosphere' },
          { lang: 'en', value: 'atm' }
        ]
      },
      definition: {
        en: 'non-SI unit of pressure equal to 101325 Pa',
        source: 'ISO 80000-4:2006'
      },
      hierarchy: {
        broader: [
          {
            uri: 'http://urn.fi/URN:NBN:fi:au:ucum:r102',
            ucumCode: 'Pa',
            label: 'pascal',
            level: 1
          }
        ],
        narrower: [
          {
            uri: 'http://urn.fi/URN:NBN:fi:au:ucum:r145',
            ucumCode: 'mbar',
            label: 'millibar',
            level: 1
          }
        ],
        broaderTransitive: [
          'http://urn.fi/URN:NBN:fi:au:ucum:r102',
          'http://urn.fi/URN:NBN:fi:au:ucum:r001'
        ],
        narrowerTransitive: [
          'http://urn.fi/URN:NBN:fi:au:ucum:r145',
          'http://urn.fi/URN:NBN:fi:au:ucum:r146'
        ]
      },
      conversion: {
        toBaseUnit: {
          factor: 101325,
          baseUnitUri: 'http://urn.fi/URN:NBN:fi:au:ucum:r102',
          baseUnitCode: 'Pa',
          operation: 'multiply'
        },
        formula: '101325 Pa',
        isMetric: false
      },
      classification: {
        dimension: 'pressure',
        quantityKind: 'http://qudt.org/vocab/quantitykind/Pressure',
        system: 'other',
        categories: ['iso1000', 'atmospheric', 'clinical'],
        isBaseUnit: false,
        isArbitrary: false
      },
      iso80000: {
        compliant: true,
        part: 'ISO 80000-4',
        section: '4-15.a',
        status: 'accepted',
        alternativeSymbols: ['atm', 'Atm']
      },
      metadata: {
        fintoLastFetched: new Date('2025-01-15'),
        fintoVersion: '2.19',
        cacheExpiry: new Date('2025-02-15'),
        syncStatus: 'current',
        lastModified: new Date('2025-01-15')
      },
      sensorThings: {
        observationCount: NumberLong(12453),
        datastreamCount: 28,
        lastUsed: new Date('2025-01-15T09:45:00Z'),
        frequencyScore: 0.89
      }
    },
    {
      uri: 'http://urn.fi/URN:NBN:fi:au:ucum:r28',
      ucumCode: 'Cel',
      ucumCodeCaseSensitive: 'Cel',
      labels: {
        preferred: {
          en: 'degree Celsius',
          fi: 'celsiusaste'
        },
        alternative: [
          { lang: 'en', value: '°C' },
          { lang: 'en', value: 'celsius' }
        ]
      },
      definition: {
        en: 'SI derived unit of temperature',
        source: 'ISO 80000-5'
      },
      hierarchy: {
        broader: [
          {
            uri: 'http://urn.fi/URN:NBN:fi:au:ucum:r27',
            ucumCode: 'K',
            label: 'kelvin',
            level: 1
          }
        ],
        narrower: [],
        broaderTransitive: [
          'http://urn.fi/URN:NBN:fi:au:ucum:r27'
        ],
        narrowerTransitive: []
      },
      conversion: {
        toBaseUnit: {
          factor: 1,
          baseUnitUri: 'http://urn.fi/URN:NBN:fi:au:ucum:r27',
          baseUnitCode: 'K',
          operation: 'add'
        },
        formula: 'K - 273.15',
        isMetric: true
      },
      classification: {
        dimension: 'temperature',
        quantityKind: 'http://qudt.org/vocab/quantitykind/Temperature',
        system: 'SI-derived',
        categories: ['iso1000', 'thermodynamic'],
        isBaseUnit: false,
        isArbitrary: false
      },
      iso80000: {
        compliant: true,
        part: 'ISO 80000-5',
        section: '5-2',
        status: 'accepted',
        alternativeSymbols: ['°C']
      },
      metadata: {
        fintoLastFetched: new Date('2025-01-15'),
        fintoVersion: '2.19',
        cacheExpiry: new Date('2025-02-15'),
        syncStatus: 'current',
        lastModified: new Date('2025-01-15')
      },
      sensorThings: {
        observationCount: NumberLong(543210),
        datastreamCount: 156,
        lastUsed: new Date('2025-01-15T14:30:00Z'),
        frequencyScore: 0.98
      }
    }
  ];
  
  try {
    const result = db[COLLECTION_NAME].insertMany(sampleUnits, { ordered: false });
    print(`  ✅ Inserted ${result.insertedCount} sample units`);
  } catch (error) {
    if (error.code === 11000) {
      print(`  ⚠️  Some units already exist (duplicate key)`);
    } else {
      print(`  ❌ Error inserting sample data: ${error.message}`);
    }
  }
}

// Show example queries
function showExampleQueries() {
  const db = getSTDatabase();
  
  print('\n📊 Example Queries:');
  print('-'.repeat(40));
  
  // Find all pressure units
  print('\n1. Find all pressure units:');
  const pressureUnits = db[COLLECTION_NAME].find(
    { 'classification.dimension': 'pressure' },
    { ucumCode: 1, 'labels.preferred.en': 1 }
  ).limit(3);
  
  pressureUnits.forEach(unit => {
    print(`   • ${unit.ucumCode}: ${unit.labels?.preferred?.en}`);
  });
  
  // Find compatible units for conversion
  print('\n2. Find units that can be converted to Pascal:');
  const compatibleUnits = db[COLLECTION_NAME].find(
    { 'hierarchy.broaderTransitive': 'http://urn.fi/URN:NBN:fi:au:ucum:r102' },
    { ucumCode: 1, 'conversion.toBaseUnit.factor': 1 }
  ).limit(3);
  
  compatibleUnits.forEach(unit => {
    print(`   • ${unit.ucumCode}: factor = ${unit.conversion?.toBaseUnit?.factor}`);
  });
  
  // Find ISO 80000 compliant units
  print('\n3. ISO 80000 compliant units:');
  const isoUnits = db[COLLECTION_NAME].find(
    { 'iso80000.compliant': true },
    { ucumCode: 1, 'iso80000.part': 1 }
  ).limit(3);
  
  isoUnits.forEach(unit => {
    print(`   • ${unit.ucumCode}: ${unit.iso80000?.part}`);
  });
}

// Main execution
if (typeof db !== 'undefined') {
  print('\n🚀 Setting up Unit of Measurement Collection\n');
  
  if (createUnitOfMeasurementCollection()) {
    createIndexes();
    insertSampleUnits();
    showExampleQueries();
    
    print('\n✅ Unit of Measurement collection setup completed!');
    print('\n📐 Collection Features:');
    print('  • UCUM ontology integration with Finto API');
    print('  • Hierarchical unit relationships (SKOS-based)');
    print('  • Automatic unit conversion support');
    print('  • ISO 80000 compliance tracking');
    print('  • TTL-based cache management');
    print('  • Usage frequency optimization');
    
    print('\n🔗 Integration Points:');
    print('  • Observations can reference units by URI');
    print('  • Automatic conversion in aggregation queries');
    print('  • Support for broader/narrower concept queries');
    print('  • Compatible with QUDT and OM ontologies');
  } else {
    print('\n⚠️  Collection already exists. Skipping creation.');
  }
} else {
  print('Please run this script with mongosh');
}
