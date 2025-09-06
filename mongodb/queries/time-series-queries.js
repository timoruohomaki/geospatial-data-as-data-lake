/**
 * Time-Series Analytics Queries
 * 
 * Example queries for analyzing time-series observation data.
 * These queries demonstrate common analytical patterns.
 * 
 * Usage: mongosh --file time-series-queries.js
 */

// Load connection configuration
load('../setup/00-connection.js');

// Get database connection
const db = getSTDatabase();

print('\n📊 Time-Series Analytics Query Examples');
print('='.repeat(50));

// ============================================================================
// QUERY 1: Hourly Average Temperature
// ============================================================================
print('\n1️⃣  Hourly Average Temperature for a Datastream');
print('-'.repeat(40));

const hourlyAverage = db.observations.aggregate([
  // Filter for specific datastream and time range
  {
    $match: {
      'datastream.datastreamId': 'DS-001',
      phenomenonTime: {
        $gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        $lt: new Date()
      }
    }
  },
  // Group by hour
  {
    $group: {
      _id: {
        date: { $dateToString: { format: '%Y-%m-%d', date: '$phenomenonTime' } },
        hour: { $hour: '$phenomenonTime' }
      },
      avgTemp: { $avg: '$result' },
      minTemp: { $min: '$result' },
      maxTemp: { $max: '$result' },
      count: { $sum: 1 }
    }
  },
  // Sort by date and hour
  {
    $sort: { '_id.date': 1, '_id.hour': 1 }
  },
  // Limit results for display
  { $limit: 10 }
]);

print('Results:');
hourlyAverage.forEach(doc => {
  print(`  ${doc._id.date} ${doc._id.hour}:00 - Avg: ${doc.avgTemp.toFixed(2)}°C, Min: ${doc.minTemp}°C, Max: ${doc.maxTemp}°C (${doc.count} observations)`);
});

// ============================================================================
// QUERY 2: Daily Statistics with Date Dimension
// ============================================================================
print('\n2️⃣  Daily Statistics with Business Day Filter');
print('-'.repeat(40));

const dailyStats = db.observations.aggregate([
  // Join with date dimension
  {
    $lookup: {
      from: 'date_dimension',
      localField: 'date_key',
      foreignField: '_id',
      as: 'date_info'
    }
  },
  { $unwind: '$date_info' },
  
  // Filter for business days only
  {
    $match: {
      'date_info.is_business_day': true,
      'datastream.observedPropertyId': 'PROP-001',
      phenomenonTime: {
        $gte: new Date('2025-01-01'),
        $lt: new Date('2025-02-01')
      }
    }
  },
  
  // Group by week
  {
    $group: {
      _id: {
        year: '$date_info.year',
        week: '$date_info.iso_week'
      },
      weeklyAvg: { $avg: '$result' },
      weeklyMin: { $min: '$result' },
      weeklyMax: { $max: '$result' },
      observationCount: { $sum: 1 }
    }
  },
  
  // Sort by year and week
  { $sort: { '_id.year': 1, '_id.week': 1 } },
  { $limit: 5 }
]);

print('Weekly Business Day Statistics:');
dailyStats.forEach(doc => {
  print(`  Week ${doc._id.week}/${doc._id.year}: Avg=${doc.weeklyAvg?.toFixed(2)}, Min=${doc.weeklyMin}, Max=${doc.weeklyMax}, Count=${doc.observationCount}`);
});

// ============================================================================
// QUERY 3: Multi-Datastream Comparison
// ============================================================================
print('\n3️⃣  Compare Multiple Datastreams');
print('-'.repeat(40));

const comparison = db.observations.aggregate([
  {
    $match: {
      'datastream.datastreamId': { $in: ['DS-001', 'DS-002', 'DS-003'] },
      phenomenonTime: {
        $gte: new Date('2025-01-15T00:00:00Z'),
        $lt: new Date('2025-01-16T00:00:00Z')
      }
    }
  },
  {
    $group: {
      _id: '$datastream.datastreamId',
      avgValue: { $avg: '$result' },
      minValue: { $min: '$result' },
      maxValue: { $max: '$result' },
      stdDev: { $stdDevPop: '$result' },
      count: { $sum: 1 }
    }
  },
  { $sort: { '_id': 1 } }
]);

print('Datastream Comparison:');
comparison.forEach(doc => {
  print(`  ${doc._id}: Avg=${doc.avgValue?.toFixed(2)}, StdDev=${doc.stdDev?.toFixed(2)}, Range=[${doc.minValue}-${doc.maxValue}], N=${doc.count}`);
});

// ============================================================================
// QUERY 4: Time-Series Trend Analysis
// ============================================================================
print('\n4️⃣  Trend Analysis with Moving Average');
print('-'.repeat(40));

const trendAnalysis = db.observations.aggregate([
  {
    $match: {
      'datastream.datastreamId': 'DS-001',
      phenomenonTime: {
        $gte: new Date('2025-01-01'),
        $lt: new Date('2025-01-16')
      }
    }
  },
  // Sort by time for window function
  { $sort: { phenomenonTime: 1 } },
  
  // Calculate moving average using window function
  {
    $setWindowFields: {
      partitionBy: '$datastream.datastreamId',
      sortBy: { phenomenonTime: 1 },
      output: {
        movingAvg: {
          $avg: '$result',
          window: {
            range: [-3600000, 0], // 1 hour window in milliseconds
            unit: 'millisecond'
          }
        },
        movingMin: {
          $min: '$result',
          window: {
            range: [-3600000, 0],
            unit: 'millisecond'
          }
        },
        movingMax: {
          $max: '$result',
          window: {
            range: [-3600000, 0],
            unit: 'millisecond'
          }
        }
      }
    }
  },
  
  // Sample every 100th point for display
  { $skip: 0 },
  { $limit: 5 }
]);

print('Moving Average Analysis:');
trendAnalysis.forEach(doc => {
  const time = doc.phenomenonTime.toISOString().slice(11, 19);
  print(`  ${time}: Value=${doc.result?.toFixed(2)}, Moving Avg=${doc.movingAvg?.toFixed(2)}, Range=[${doc.movingMin?.toFixed(2)}-${doc.movingMax?.toFixed(2)}]`);
});

// ============================================================================
// QUERY 5: Quality-Filtered Aggregation
// ============================================================================
print('\n5️⃣  Quality-Filtered Statistics');
print('-'.repeat(40));

const qualityStats = db.observations.aggregate([
  {
    $match: {
      'datastream.datastreamId': 'DS-001',
      resultQuality: { $in: ['good', 'uncertain'] },
      phenomenonTime: {
        $gte: new Date('2025-01-15T00:00:00Z'),
        $lt: new Date('2025-01-16T00:00:00Z')
      }
    }
  },
  {
    $facet: {
      byQuality: [
        {
          $group: {
            _id: '$resultQuality',
            count: { $sum: 1 },
            avgValue: { $avg: '$result' }
          }
        }
      ],
      overall: [
        {
          $group: {
            _id: null,
            totalCount: { $sum: 1 },
            avgValue: { $avg: '$result' },
            percentiles: {
              $percentile: {
                input: '$result',
                p: [0.25, 0.5, 0.75, 0.95],
                method: 'approximate'
              }
            }
          }
        }
      ]
    }
  }
]);

const stats = qualityStats.toArray()[0];
print('Quality Statistics:');
if (stats?.byQuality) {
  stats.byQuality.forEach(q => {
    print(`  ${q._id}: Count=${q.count}, Avg=${q.avgValue?.toFixed(2)}`);
  });
}
if (stats?.overall?.[0]) {
  const o = stats.overall[0];
  print(`  Overall: Count=${o.totalCount}, Avg=${o.avgValue?.toFixed(2)}`);
  if (o.percentiles) {
    print(`  Percentiles: P25=${o.percentiles[0]?.toFixed(2)}, P50=${o.percentiles[1]?.toFixed(2)}, P75=${o.percentiles[2]?.toFixed(2)}, P95=${o.percentiles[3]?.toFixed(2)}`);
  }
}

// ============================================================================
// QUERY 6: Anomaly Detection
// ============================================================================
print('\n6️⃣  Anomaly Detection (Values Outside 2 Standard Deviations)');
print('-'.repeat(40));

const anomalies = db.observations.aggregate([
  {
    $match: {
      'datastream.datastreamId': 'DS-001',
      phenomenonTime: {
        $gte: new Date('2025-01-15T00:00:00Z'),
        $lt: new Date('2025-01-16T00:00:00Z')
      }
    }
  },
  // Calculate statistics
  {
    $group: {
      _id: null,
      values: { $push: { time: '$phenomenonTime', value: '$result' } },
      mean: { $avg: '$result' },
      stdDev: { $stdDevPop: '$result' }
    }
  },
  // Unwind and mark anomalies
  { $unwind: '$values' },
  {
    $addFields: {
      zScore: {
        $divide: [
          { $subtract: ['$values.value', '$mean'] },
          '$stdDev'
        ]
      }
    }
  },
  // Filter for anomalies
  {
    $match: {
      $or: [
        { zScore: { $gt: 2 } },
        { zScore: { $lt: -2 } }
      ]
    }
  },
  { $limit: 5 }
]);

print('Detected Anomalies:');
anomalies.forEach(doc => {
  const time = doc.values.time.toISOString().slice(11, 19);
  print(`  ${time}: Value=${doc.values.value.toFixed(2)}, Z-Score=${doc.zScore.toFixed(2)} (Mean=${doc.mean.toFixed(2)}, StdDev=${doc.stdDev.toFixed(2)})`);
});

// ============================================================================
// QUERY 7: Feature of Interest Aggregation
// ============================================================================
print('\n7️⃣  Aggregate by Feature of Interest with External Data');
print('-'.repeat(40));

const foiAggregation = db.observations.aggregate([
  {
    $match: {
      featureOfInterestId: { $exists: true },
      phenomenonTime: {
        $gte: new Date('2025-01-15T00:00:00Z'),
        $lt: new Date('2025-01-16T00:00:00Z')
      }
    }
  },
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
  
  // Group by FOI and external feature
  {
    $group: {
      _id: {
        foiId: '$featureOfInterestId',
        foiName: '$foi.name',
        landUse: { $arrayElemAt: ['$foi.externalFeatures.cachedMetadata.properties.landUse', 0] }
      },
      avgValue: { $avg: '$result' },
      count: { $sum: 1 }
    }
  },
  { $limit: 5 }
]);

print('Feature of Interest Aggregation:');
foiAggregation.forEach(doc => {
  print(`  ${doc._id.foiName} (${doc._id.landUse || 'N/A'}): Avg=${doc.avgValue?.toFixed(2)}, Count=${doc.count}`);
});

// ============================================================================
// Performance Tips
// ============================================================================
print('\n💡 Performance Tips:');
print('-'.repeat(40));
print('  • Use time-series collections for 90% storage reduction');
print('  • Create compound indexes for common query patterns');
print('  • Leverage date_key for efficient date dimension joins');
print('  • Use $setWindowFields for time-based calculations');
print('  • Consider pre-aggregation for dashboard queries');
print('  • Use explain() to analyze query performance');

print('\n✅ Query examples completed successfully!\n');
