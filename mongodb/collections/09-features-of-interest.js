/**
 * Features of Interest Collection (Enhanced)
 * 
 * Creates the features_of_interest collection with support for
 * external OGC API Features integration and hierarchical relationships.
 * 
 * Usage: mongosh --file 09-features-of-interest.js
 */

// Load connection configuration
load('../setup/00-connection.js');

const COLLECTION_NAME = 'features_of_interest';

// Collection schema definition
const COLLECTION_SCHEMA = {
  bsonType: 'object',
  required: ['_id', 'name', 'encodingType', 'feature'],
  properties: {
    _id: {
      bsonType: 'string',
      description: 'Unique identifier for the feature of interest'
    },
    name: {
      bsonType: 'string',
      description: 'Human-readable name'
    },
    description: {
      bsonType: 'string',
      description: 'Detailed description'
    },
    encodingType: {
      bsonType: 'string',
      enum: ['application/vnd.geo+json', 'application/gml+xml'],
      description: 'Encoding type of the feature'
    },
    feature: {
      bsonType: 'object',
      required: ['type'],
      properties: {
        type: {
          bsonType: 'string',
          enum: ['Feature']
        },
        geometry: {
          bsonType: 'object',
          properties: {
            type: {
              bsonType: 'string',
              enum: ['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon']
            },
            coordinates: {
              bsonType: 'array'
            }
          }
        },
        properties: {
          bsonType: 'object'
        }
      }
    },
    externalFeatures: {
      bsonType: 'array',
      items: {
        bsonType: 'object',
        properties: {
          featureId: { bsonType: 'string' },
          featureAPI: {
            bsonType: 'object',
            properties: {
              baseUrl: { bsonType: 'string' },
              collection: { bsonType: 'string' },
              itemId: { bsonType: 'string' },
              href: { bsonType: 'string' },
              formats: {
                bsonType: 'array',
                items: { bsonType: 'string' }
              }
            }
          },
          association: {
            bsonType: 'object',
            properties: {
              type: {
                bsonType: 'string',
                enum: ['within', 'contains', 'intersects', 'touches', 'overlaps', 'part_of']
              },
              role: { bsonType: 'string' },
              confidence: { bsonType: 'number', minimum: 0, maximum: 1 },
              establishedAt: { bsonType: 'date' },
              establishedBy: { bsonType: 'string' },
              validFrom: { bsonType: 'date' },
              validTo: { bsonType: ['date', 'null'] }
            }
          },
          cachedMetadata: {
            bsonType: 'object',
            properties: {
              lastFetched: { bsonType: 'date' },
              properties: { bsonType: 'object' },
              bbox: {
                bsonType: 'array',
                items: { bsonType: 'number' }
              },
              updateFrequency: { bsonType: 'string' }
            }
          }
        }
      }
    },
    hierarchy: {
      bsonType: 'object',
      properties: {
        parents: {
          bsonType: 'array',
          items: {
            bsonType: 'object',
            properties: {
              level: { bsonType: 'string' },
              foiId: { bsonType: 'string' },
              name: { bsonType: 'string' }
            }
          }
        },
        children: {
          bsonType: 'array',
          items: {
            bsonType: 'object',
            properties: {
              level: { bsonType: 'string' },
              foiId: { bsonType: 'string' },
              name: { bsonType: 'string' }
            }
          }
        },
        semanticRelations: {
          bsonType: 'array',
          items: {
            bsonType: 'object',
            properties: {
              predicate: { bsonType: 'string' },
              uri: { bsonType: 'string' },
              source: { bsonType: 'string' }
            }
          }
        }
      }
    },
    observationContext: {
      bsonType: 'object',
      properties: {
        primaryPurpose: { bsonType: 'string' },
        relevantProperties: {
          bsonType: 'array',
          items: { bsonType: 'string' }
        },
        aggregationLevel: { bsonType: 'string' },
        representativePoint: {
          bsonType: 'object',
          properties: {
            type: { bsonType: 'string', enum: ['Point'] },
            coordinates: { bsonType: 'array' },
            elevation: { bsonType: 'number' }
          }
        }
      }
    },
    statistics: {
      bsonType: 'object',
      properties: {
        observationCount: { bsonType: 'long' },
        firstObservation: { bsonType: 'date' },
        lastObservation: { bsonType: 'date' },
        averageObservationsPerDay: { bsonType: 'number' },
        associatedDatastreams: { bsonType: 'int' }
      }
    },
    quality: {
      bsonType: 'object',
      properties: {
        geometrySource: { bsonType: 'string' },
        geometryAccuracy: { bsonType: 'number' },
        lastValidated: { bsonType: 'date' }
      }
    },
    tags: {
      bsonType: 'array',
      items: { bsonType: 'string' }
    },
    created_at: { bsonType: 'date' },
    updated_at: { bsonType: 'date' }
  }
};

// Create the collection
function createFeaturesOfInterestCollection() {
  const db = getSTDatabase();
  
  print(`\n🌍 Creating Collection: ${COLLECTION_NAME}`);
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
    // Geospatial index
    {
      keys: { 'feature.geometry': '2dsphere' },
      options: { 
        name: 'idx_geometry_2dsphere',
        background: true 
      }
    },
    // External features lookup
    {
      keys: { 'externalFeatures.featureId': 1 },
      options: { 
        name: 'idx_external_feature_id',
        background: true 
      }
    },
    // Association type queries
    {
      keys: { 'externalFeatures.association.type': 1 },
      options: { 
        name: 'idx_association_type',
        background: true 
      }
    },
    // API collection lookup
    {
      keys: { 
        'externalFeatures.featureAPI.collection': 1,
        'externalFeatures.featureAPI.itemId': 1 
      },
      options: { 
        name: 'idx_api_collection_item',
        background: true 
      }
    },
    // Hierarchy navigation
    {
      keys: { 'hierarchy.parents.foiId': 1 },
      options: { 
        name: 'idx_parent_foi',
        background: true 
      }
    },
    {
      keys: { 'hierarchy.children.foiId': 1 },
      options: { 
        name: 'idx_child_foi',
        background: true 
      }
    },
    // Observation context
    {
      keys: { 'observationContext.relevantProperties': 1 },
      options: { 
        name: 'idx_relevant_properties',
        background: true 
      }
    },
    // Tags for categorization
    {
      keys: { 'tags': 1 },
      options: { 
        name: 'idx_tags',
        background: true 
      }
    },
    // Text search
    {
      keys: { 'name': 'text', 'description': 'text' },
      options: { 
        name: 'idx_text_search',
        background: true,
        weights: {
          name: 10,
          description: 5
        }
      }
    },
    // Update tracking
    {
      keys: { 'updated_at': -1 },
      options: { 
        name: 'idx_updated_at',
        background: true 
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
  
  print(`\n📝 Inserting sample feature of interest...`);
  
  const sampleFOI = {
    _id: 'FOI-001',
    name: 'Building A - Room 101',
    description: 'Conference room in Building A associated with city parcel',
    encodingType: 'application/vnd.geo+json',
    feature: {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-114.133, 51.080], 
          [-114.132, 51.080], 
          [-114.132, 51.081], 
          [-114.133, 51.081], 
          [-114.133, 51.080]
        ]]
      },
      properties: {
        area: 45.5,
        height: 3.2,
        occupancy: 12
      }
    },
    externalFeatures: [
      {
        featureId: 'parcels/items/12345',
        featureAPI: {
          baseUrl: 'https://geodata.city.gov/ogcapi',
          collection: 'parcels',
          itemId: '12345',
          href: 'https://geodata.city.gov/ogcapi/collections/parcels/items/12345',
          formats: ['application/geo+json', 'application/gml+xml', 'text/html']
        },
        association: {
          type: 'within',
          role: 'container',
          confidence: 1.0,
          establishedAt: new Date('2024-01-15'),
          establishedBy: 'cadastral_matching_service',
          validFrom: new Date('2024-01-15'),
          validTo: null
        },
        cachedMetadata: {
          lastFetched: new Date('2025-01-10'),
          properties: {
            parcelNumber: '2024-B-12345',
            owner: 'Municipal Government',
            landUse: 'institutional',
            zoning: 'P1',
            area: 4500.25
          },
          bbox: [-114.133, 51.080, -114.130, 51.085],
          updateFrequency: 'monthly'
        }
      },
      {
        featureId: 'buildings/items/BLD-2024-001',
        featureAPI: {
          baseUrl: 'https://geodata.city.gov/ogcapi',
          collection: 'buildings',
          itemId: 'BLD-2024-001',
          href: 'https://geodata.city.gov/ogcapi/collections/buildings/items/BLD-2024-001'
        },
        association: {
          type: 'part_of',
          role: 'building_component',
          confidence: 1.0
        },
        cachedMetadata: {
          lastFetched: new Date('2025-01-10'),
          properties: {
            buildingName: 'City Hall Annex A',
            floors: 5,
            yearBuilt: 1985,
            buildingType: 'office'
          }
        }
      }
    ],
    hierarchy: {
      parents: [
        {
          level: 'building',
          foiId: 'FOI-BUILDING-A',
          name: 'Building A'
        },
        {
          level: 'campus',
          foiId: 'FOI-CAMPUS-NORTH',
          name: 'North Campus'
        }
      ],
      children: [
        {
          level: 'sensor_location',
          foiId: 'FOI-001-SENSOR-NE',
          name: 'Northeast corner sensor mount'
        }
      ],
      semanticRelations: [
        {
          predicate: 'sameAs',
          uri: 'https://linkeddata.org/resource/room/CH-A-101',
          source: 'organizational_linkeddata'
        }
      ]
    },
    observationContext: {
      primaryPurpose: 'environmental_monitoring',
      relevantProperties: ['temperature', 'humidity', 'co2_level', 'occupancy'],
      aggregationLevel: 'room',
      representativePoint: {
        type: 'Point',
        coordinates: [-114.1325, 51.0805],
        elevation: 1105.5
      }
    },
    statistics: {
      observationCount: NumberLong(1245000),
      firstObservation: new Date('2024-01-15'),
      lastObservation: new Date('2025-01-15T14:30:00Z'),
      averageObservationsPerDay: 3400,
      associatedDatastreams: 4
    },
    quality: {
      geometrySource: 'building_plans',
      geometryAccuracy: 0.1,
      lastValidated: new Date('2024-12-01')
    },
    tags: ['indoor', 'controlled_environment', 'public_building'],
    created_at: new Date('2024-01-15'),
    updated_at: new Date('2025-01-15')
  };
  
  try {
    db[COLLECTION_NAME].insertOne(sampleFOI);
    print(`  ✅ Inserted sample feature of interest: ${sampleFOI._id}`);
  } catch (error) {
    if (error.code === 11000) {
      print(`  ⚠️  Sample document already exists`);
    } else {
      print(`  ❌ Error inserting sample data: ${error.message}`);
    }
  }
}

// Main execution
if (typeof db !== 'undefined') {
  print('\n🚀 Setting up Features of Interest Collection\n');
  
  if (createFeaturesOfInterestCollection()) {
    createIndexes();
    insertSampleData();
    
    print('\n✅ Features of Interest collection setup completed!');
    print('\n🌍 Collection Features:');
    print('  • Support for external OGC API Features integration');
    print('  • Hierarchical spatial relationships');
    print('  • Cached external feature metadata');
    print('  • Semantic relationships (SKOS-like)');
    print('  • Full geospatial query support');
    print('  • Text search on names and descriptions');
  } else {
    print('\n⚠️  Collection already exists. Skipping creation.');
  }
} else {
  print('Please run this script with mongosh');
}
