/**
 * Cross-Data Lake Integration Queries
 * 
 * Example queries that integrate SensorThings observations with
 * external OGC API Features and UCUM ontology data.
 * 
 * Usage: mongosh --file cross-lake-queries.js
 */

// Load connection configuration
load('../setup/00-connection.js');

// Get database connection
const db = getSTDatabase();

print('\n🌐 Cross-Data Lake Integration Queries');
print('='.repeat(50));

// ============================================================================
// QUERY 1: Observations by External Land Use Type
// ============================================================================
print('\n1️⃣  Find Observations in Commercial Land Use Zones');
print('-'.repeat(40));

const landUseObservations = db.observations.aggregate([
  // Join with features_of_interest
  {
    $lookup: {
      from: 'features_of_interest',
      localField: 'featureOfInterestId',
      foreignField: '_id',
      as: 'foi'
    }
  },
  { $unwind: '$foi' },
  
  // Filter by external feature property (land use)
  {
    $match: {
      'foi.externalFeatures.cachedMetadata.properties.landUse': 'commercial',
      phenomenonTime: {
        $gte: new Date('2025-01-15T00:00:00Z'),
        $lt: new Date('2025-01-16T00:00:00Z')
      }
    }
  },
  
  // Group by external parcel
  {
    $group: {
      _id: {
        parcelId: { $arrayElemAt: ['$foi.externalFeatures.featureAPI.itemId', 0] },
        parcelNumber: { $arrayElemAt: ['$foi.externalFeatures.cachedMetadata.properties.parcelNumber', 0] },
        propertyType: '$datastream.observedPropertyId'
      },
      avgValue: { $avg: '$result' },
      minValue: { $min: '$result' },
      maxValue: { $max: '$result' },
      count: { $sum: 1 }
    }
  },
  { $limit: 5 }
]);

print('Observations in Commercial Zones:');
landUseObservations.forEach(doc => {
  print(`  Parcel ${doc._id.parcelNumber} (${doc._id.propertyType}): Avg=${doc.avgValue?.toFixed(2)}, Range=[${doc.minValue}-${doc.maxValue}], N=${doc.count}`);
});

// ============================================================================
// QUERY 2: Hierarchical Aggregation (Building Level)
// ============================================================================
print('\n2️⃣  Aggregate Observations by Building Hierarchy');
print('-'.repeat(40));

const buildingAggregation = db.observations.aggregate([
  // Join with FOI
  {
    $lookup: {
      from: 'features_of_interest',
      localField: 'featureOfInterestId',
      foreignField: '_id',
      as: 'foi'
    }
  },
  { $unwind: '$foi' },
  
  // Extract building-level parent
  {
    $addFields: {
      buildingFOI: {
        $filter: {
          input: '$foi.hierarchy.parents',
          as: 'parent',
          cond: { $eq: ['$$parent.level', 'building'] }
        }
      }
    }
  },
  { $unwind: '$buildingFOI' },
  
  // Group by building
  {
    $group: {
      _id: {
        buildingId: '$buildingFOI.foiId',
        buildingName: '$buildingFOI.name',
        observedProperty: '$datastream.observedPropertyId'
      },
      avgValue: { $avg: '$result' },
      roomCount: { $addToSet: '$featureOfInterestId' },
      observationCount: { $sum: 1 }
    }
  },
  
  // Calculate room count
  {
    $addFields: {
      roomCount: { $size: '$roomCount' }
    }
  },
  { $limit: 5 }
]);

print('Building-Level Aggregation:');
buildingAggregation.forEach(doc => {
  print(`  ${doc._id.buildingName} (${doc._id.observedProperty}): Avg=${doc.avgValue?.toFixed(2)}, Rooms=${doc.roomCount}, Observations=${doc.observationCount}`);
});

// ============================================================================
// QUERY 3: Unit Conversion with UCUM Ontology
// ============================================================================
print('\n3️⃣  Convert Units Using UCUM Hierarchy');
print('-'.repeat(40));

const unitConversion = db.observations.aggregate([
  // Join with unit of measurement
  {
    $lookup: {
      from: 'unit_of_measurement',
      let: { unitSymbol: '$datastream.unitOfMeasurement.symbol' },
      pipeline: [
        { $match: { $expr: { $eq: ['$labels.preferred.en', '$$unitSymbol'] } } }
      ],
      as: 'unit'
    }
  },
  { $unwind: { path: '$unit', preserveNullAndEmptyArrays: true } },
  
  // Add base unit conversion
  {
    $addFields: {
      convertedResult: {
        $cond: {
          if: { $ne: ['$unit.conversion.toBaseUnit.factor', null] },
          then: { $multiply: ['$result', '$unit.conversion.toBaseUnit.factor'] },
          else: '$result'
        }
      },
      baseUnit: {
        $cond: {
          if: { $ne: ['$unit.conversion.toBaseUnit.baseUnitCode', null] },
          then: '$unit.conversion.toBaseUnit.baseUnitCode',
          else: '$datastream.unitOfMeasurement.symbol'
        }
      }
    }
  },
  
  // Group by base unit
  {
    $group: {
      _id: {
        datastreamId: '$datastream.datastreamId',
        originalUnit: '$datastream.unitOfMeasurement.symbol',
        baseUnit: '$baseUnit'
      },
      avgOriginal: { $avg: '$result' },
      avgConverted: { $avg: '$convertedResult' },
      count: { $sum: 1 }
    }
  },
  { $limit: 5 }
]);

print('Unit Conversion Results:');
unitConversion.forEach(doc => {
  print(`  ${doc._id.datastreamId}: ${doc.avgOriginal?.toFixed(2)} ${doc._id.originalUnit} = ${doc.avgConverted?.toFixed(2)} ${doc._id.baseUnit} (N=${doc.count})`);
});

// ============================================================================
// QUERY 4: Spatial Query with External Features
// ============================================================================
print('\n4️⃣  Find Observations Near External Features');
print('-'.repeat(40));

const spatialQuery = db.observations.aggregate([
  // Spatial filter
  {
    $match: {
      location: {
        $geoWithin: {
          $centerSphere: [[-114.133, 51.08], 0.001] // ~100m radius
        }
      }
    }
  },
  
  // Join with FOI
  {
    $lookup: {
      from: 'features_of_interest',
      localField: 'featureOfInterestId',
      foreignField: '_id',
      as: 'foi'
    }
  },
  { $unwind: '$foi' },
  
  // Join with external feature cache
  {
    $lookup: {
      from: 'external_feature_cache',
      let: { externalIds: '$foi.externalFeatures.featureId' },
      pipeline: [
        { $match: { $expr: { $in: ['$_id', '$$externalIds'] } } }
      ],
      as: 'externalFeatures'
    }
  },
  
  // Project relevant fields
  {
    $project: {
      phenomenonTime: 1,
      result: 1,
      foiName: '$foi.name',
      externalBuilding: {
        $filter: {
          input: '$externalFeatures',
          as: 'ext',
          cond: { $eq: ['$$ext.source.collection', 'buildings'] }
        }
      }
    }
  },
  { $limit: 5 }
]);

print('Observations with External Features:');
spatialQuery.forEach(doc => {
  const building = doc.externalBuilding?.[0];
  const buildingName = building?.feature?.properties?.buildingName || 'Unknown';
  print(`  ${doc.phenomenonTime.toISOString().slice(11, 19)}: ${doc.result} at ${doc.foiName} (Building: ${buildingName})`);
});

// ============================================================================
// QUERY 5: Cross-Reference Multiple External APIs
// ============================================================================
print('\n5️⃣  Cross-Reference Multiple External Feature APIs');
print('-'.repeat(40));

const multiApiQuery = db.features_of_interest.aggregate([
  // Find FOIs with multiple external associations
  {
    $match: {
      'externalFeatures.1': { $exists: true } // Has at least 2 external features
    }
  },
  
  // Unwind external features
  { $unwind: '$externalFeatures' },
  
  // Group by API endpoint
  {
    $group: {
      _id: {
        foiId: '$_id',
        foiName: '$name',
        apiBase: '$externalFeatures.featureAPI.baseUrl'
      },
      collections: { $addToSet: '$externalFeatures.featureAPI.collection' },
      featureCount: { $sum: 1 }
    }
  },
  
  // Group by FOI to show all APIs
  {
    $group: {
      _id: {
        foiId: '$_id.foiId',
        foiName: '$_id.foiName'
      },
      apis: {
        $push: {
          url: '$_id.apiBase',
          collections: '$collections',
          count: '$featureCount'
        }
      }
    }
  },
  { $limit: 3 }
]);

print('Features with Multiple External APIs:');
multiApiQuery.forEach(doc => {
  print(`  ${doc._id.foiName}:`);
  doc.apis.forEach(api => {
    print(`    • ${api.url}: ${api.collections.join(', ')} (${api.count} features)`);
  });
});

// ============================================================================
// QUERY 6: Semantic Relationship Navigation
// ============================================================================
print('\n6️⃣  Navigate Semantic Relationships');
print('-'.repeat(40));

const semanticQuery = db.features_of_interest.aggregate([
  // Find FOIs with semantic relations
  {
    $match: {
      'hierarchy.semanticRelations': { $exists: true, $ne: [] }
    }
  },
  
  // Unwind semantic relations
  { $unwind: '$hierarchy.semanticRelations' },
  
  // Group by predicate type
  {
    $group: {
      _id: '$hierarchy.semanticRelations.predicate',
      features: {
        $push: {
          foi: '$name',
          uri: '$hierarchy.semanticRelations.uri',
          source: '$hierarchy.semanticRelations.source'
        }
      },
      count: { $sum: 1 }
    }
  }
]);

print('Semantic Relationships:');
semanticQuery.forEach(doc => {
  print(`  ${doc._id} (${doc.count} relationships):`);
  doc.features.slice(0, 2).forEach(f => {
    print(`    • ${f.foi} → ${f.uri} (${f.source})`);
  });
});

// ============================================================================
// QUERY 7: Feature Association Validation
// ============================================================================
print('\n7️⃣  Validate External Feature Associations');
print('-'.repeat(40));

const validationQuery = db.feature_associations.aggregate([
  // Check for stale associations
  {
    $match: {
      status: 'active',
      'synchronization.lastSync': {
        $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Older than 30 days
      }
    }
  },
  
  // Join with FOI
  {
    $lookup: {
      from: 'features_of_interest',
      localField: 'sourceFOI',
      foreignField: '_id',
      as: 'foi'
    }
  },
  { $unwind: '$foi' },
  
  // Check cache freshness
  {
    $project: {
      associationId: 1,
      foiName: '$foi.name',
      targetCollection: '$targetFeature.collection.id',
      lastSync: '$synchronization.lastSync',
      daysSinceSync: {
        $divide: [
          { $subtract: [new Date(), '$synchronization.lastSync'] },
          1000 * 60 * 60 * 24
        ]
      },
      syncFrequency: '$synchronization.syncFrequency',
      needsSync: {
        $gt: ['$synchronization.nextScheduledSync', new Date()]
      }
    }
  },
  { $limit: 5 }
]);

print('Feature Association Validation:');
validationQuery.forEach(doc => {
  const status = doc.needsSync ? '⚠️ NEEDS SYNC' : '✅ OK';
  print(`  ${doc.foiName} → ${doc.targetCollection}: ${Math.round(doc.daysSinceSync)} days old ${status}`);
});

// ============================================================================
// Helper Functions for External API Integration
// ============================================================================
print('\n🔧 Helper Functions');
print('-'.repeat(40));

// Function to fetch from OGC API Features
async function fetchFromOGCAPI(collection, featureId) {
  // This would make actual HTTP request in production
  print(`  Would fetch: ${collection}/items/${featureId}`);
  return {
    type: 'Feature',
    id: featureId,
    properties: { /* fetched properties */ }
  };
}

// Function to sync external features
async function syncExternalFeatures(foiId) {
  const foi = db.features_of_interest.findOne({ _id: foiId });
  
  if (!foi) {
    print(`  FOI ${foiId} not found`);
    return;
  }
  
  print(`  Syncing external features for: ${foi.name}`);
  
  foi.externalFeatures?.forEach(ext => {
    const cacheAge = (new Date() - ext.cachedMetadata?.lastFetched) / (1000 * 60 * 60 * 24);
    if (cacheAge > 30) {
      print(`    • ${ext.featureId}: Cache is ${Math.round(cacheAge)} days old - needs refresh`);
      // Would fetch and update here
    } else {
      print(`    • ${ext.featureId}: Cache is fresh (${Math.round(cacheAge)} days old)`);
    }
  });
}

// Example sync call
print('\nExample: Check sync status for FOI-001');
syncExternalFeatures('FOI-001');

// ============================================================================
// Performance Considerations
// ============================================================================
print('\n💡 Cross-Lake Query Tips:');
print('-'.repeat(40));
print('  • Cache external features to reduce API calls');
print('  • Use TTL indexes for automatic cache expiration');
print('  • Implement lazy loading for external data');
print('  • Consider materialized views for complex joins');
print('  • Use aggregation pipelines for efficient processing');
print('  • Monitor sync frequencies and adjust as needed');

print('\n✅ Cross-data lake queries completed successfully!\n');
