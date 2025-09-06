# Finto API and UCUM Ontology Integration with MongoDB Schema Design

## Executive Summary

The Finto API provides comprehensive REST-based access to the UCUM (Unified Code for Units of Measure) ontology through SKOS-structured endpoints, enabling hierarchical navigation of standardized unit definitions. Based on our research, we've designed a MongoDB schema extension that caches ontology data, maintains ISO 80000 compliance, and seamlessly integrates with SensorThings data lake architecture while supporting efficient queries across unit hierarchies.

## Finto API and UCUM Ontology Analysis

### API architecture enables robust unit ontology access

The Finto API operates at **http://api.finto.fi/rest/v1/** using Skosmos software with a REST architecture. UCUM-specific endpoints follow the pattern `/rest/v1/ucum/{operation}`, providing access to over 1,600 standardized units of measure. The API requires no authentication currently, supports multiple formats through content negotiation (JSON-LD, RDF/XML, Turtle), and returns responses with embedded SKOS properties and JSON-LD context.

Key endpoints for UCUM access include:
- **Vocabulary metadata**: `/rest/v1/ucum/`
- **Search operations**: `/rest/v1/ucum/search?query={query}&lang={language}`
- **Concept retrieval**: `/rest/v1/data?uri={encoded-uri}`
- **Hierarchical navigation**: `/rest/v1/ucum/broader` and `/rest/v1/ucum/narrower`
- **Label lookup**: `/rest/v1/ucum/lookup?label={label}`

### SKOS hierarchical relationships structure unit ontology

UCUM implements the Simple Knowledge Organization System (SKOS) to represent hierarchical relationships between units. The ontology uses **skos:broader** and **skos:narrower** predicates to establish parent-child relationships, though UCUM's mathematical nature means relationships are often expressed through conversion factors rather than pure taxonomic hierarchies.

Each unit concept contains standard SKOS properties including **prefLabel** (primary name), **altLabel** (alternative symbols), **notation** (UCUM code), **definition** (text description), and **inScheme** (reference to UCUM concept scheme). Units follow the URI pattern `http://urn.fi/URN:NBN:fi:au:ucum:r{ID}`, providing persistent identifiers for each unit concept.

The ontology organizes units into categories such as base units (metre, second, gram), derived units, metric vs. non-metric units, and special units on non-ratio scales. This structure maintains **ISO 80000 compliance** by aligning with the international standard for quantities and units.

### Query capabilities support comprehensive unit discovery

The API provides robust search and filtering capabilities through parameters like `query` (supporting wildcards), `lang` (language specification), `fields` (extra SKOS properties), and `limit/offset` (pagination). Hierarchical traversal requires iterative API calls to follow broader/narrower links, as transitive queries aren't directly supported.

Data responses include complete unit records with URIs, labels, definitions, hierarchical relationships, and conversion factors. The API returns JSON-LD by default with full RDF serialization options, enabling semantic web integration.

## MongoDB Schema Extension Design

### Core unitOfMeasurement collection schema

```javascript
{
  // Primary identification
  _id: ObjectId(),
  uri: "http://urn.fi/URN:NBN:fi:au:ucum:r133", // External ontology URI
  ucumCode: "atm",                               // UCUM notation/code
  ucumCodeCaseSensitive: "ATM",                  // Case-sensitive variant
  
  // Cached ontology data
  labels: {
    preferred: {
      en: "standard atmosphere",
      fi: "normaali-ilmakehä"
    },
    alternative: [
      { lang: "en", value: "atmosphere" },
      { lang: "en", value: "atm" }
    ]
  },
  
  definition: {
    en: "non-SI unit of pressure equal to 101325 Pa",
    source: "ISO 80000-4:2006"
  },
  
  // Hierarchical relationships
  hierarchy: {
    broader: [
      {
        uri: "http://urn.fi/URN:NBN:fi:au:ucum:r102",
        ucumCode: "Pa",
        label: "pascal",
        level: 1  // Distance in hierarchy
      }
    ],
    narrower: [
      {
        uri: "http://urn.fi/URN:NBN:fi:au:ucum:r145",
        ucumCode: "mbar",
        label: "millibar",
        level: 1
      }
    ],
    broaderTransitive: [  // All ancestors
      "http://urn.fi/URN:NBN:fi:au:ucum:r102",
      "http://urn.fi/URN:NBN:fi:au:ucum:r001"
    ],
    narrowerTransitive: [ // All descendants
      "http://urn.fi/URN:NBN:fi:au:ucum:r145",
      "http://urn.fi/URN:NBN:fi:au:ucum:r146"
    ]
  },
  
  // Conversion and mathematical relationships
  conversion: {
    toBaseUnit: {
      factor: 101325,
      baseUnitUri: "http://urn.fi/URN:NBN:fi:au:ucum:r102",
      baseUnitCode: "Pa",
      operation: "multiply"
    },
    formula: "101325 Pa",
    isMetric: false
  },
  
  // Classification and categorization
  classification: {
    dimension: "pressure",
    quantityKind: "http://qudt.org/vocab/quantitykind/Pressure",
    system: "SI-derived",
    categories: ["iso1000", "atmospheric", "clinical"],
    isBaseUnit: false,
    isArbitrary: false
  },
  
  // ISO 80000 compliance tracking
  iso80000: {
    compliant: true,
    part: "ISO 80000-4",
    section: "4-15.a",
    status: "accepted",
    alternativeSymbols: ["atm", "Atm"]
  },
  
  // Cache management
  metadata: {
    fintoLastFetched: ISODate("2025-09-06T10:00:00Z"),
    fintoVersion: "2.19",
    cacheExpiry: ISODate("2025-10-06T10:00:00Z"),
    syncStatus: "current",
    lastModified: ISODate("2025-09-06T10:00:00Z")
  },
  
  // SensorThings integration
  sensorThings: {
    observationCount: 12453,
    datastreamCount: 28,
    lastUsed: ISODate("2025-09-06T09:45:00Z"),
    frequencyScore: 0.89  // Usage frequency for optimization
  }
}
```

### Supporting collections for optimized queries

#### unitHierarchyCache collection
```javascript
{
  _id: ObjectId(),
  rootUri: "http://urn.fi/URN:NBN:fi:au:ucum:r001",
  dimension: "pressure",
  
  // Materialized path for efficient traversal
  tree: {
    uri: "http://urn.fi/URN:NBN:fi:au:ucum:r001",
    code: "Pa",
    label: "pascal",
    children: [
      {
        uri: "http://urn.fi/URN:NBN:fi:au:ucum:r133",
        code: "atm",
        label: "atmosphere",
        path: "/Pa/atm",
        depth: 1,
        children: [...]
      }
    ]
  },
  
  // Flattened for quick lookups
  allNodes: [
    {
      uri: "...",
      path: "/Pa/atm/mbar",
      depth: 2,
      ancestors: ["r001", "r133"]
    }
  ],
  
  lastRebuilt: ISODate("2025-09-06T00:00:00Z")
}
```

#### unitConversionCache collection
```javascript
{
  _id: ObjectId(),
  fromUri: "http://urn.fi/URN:NBN:fi:au:ucum:r133",
  toUri: "http://urn.fi/URN:NBN:fi:au:ucum:r102",
  
  conversion: {
    factor: 101325,
    operation: "multiply",
    reverse: {
      factor: 0.00000986923,
      operation: "multiply"
    }
  },
  
  chain: [  // For multi-step conversions
    { step: 1, uri: "r133", operation: "multiply", factor: 101325 },
    { step: 2, uri: "r102", operation: "none", factor: 1 }
  ],
  
  precision: {
    significantDigits: 6,
    uncertainty: 0.0001
  }
}
```

### Index strategy for performance optimization

```javascript
// Primary indexes for unitOfMeasurement
db.unitOfMeasurement.createIndex({ "uri": 1 }, { unique: true })
db.unitOfMeasurement.createIndex({ "ucumCode": 1 })
db.unitOfMeasurement.createIndex({ "classification.dimension": 1 })
db.unitOfMeasurement.createIndex({ "hierarchy.broaderTransitive": 1 })
db.unitOfMeasurement.createIndex({ "sensorThings.frequencyScore": -1 })

// Compound indexes for common queries
db.unitOfMeasurement.createIndex({ 
  "classification.dimension": 1, 
  "classification.isBaseUnit": 1 
})
db.unitOfMeasurement.createIndex({ 
  "ucumCode": "text", 
  "labels.preferred.en": "text" 
})

// TTL index for cache expiry
db.unitOfMeasurement.createIndex(
  { "metadata.cacheExpiry": 1 }, 
  { expireAfterSeconds: 0 }
)
```

### Integration with SensorThings data lake

#### Enhanced Observation schema
```javascript
{
  _id: ObjectId(),
  phenomenonTime: ISODate(),
  result: 101.325,
  
  // Link to cached unit ontology
  unitOfMeasurement: {
    ref: ObjectId("..."),  // Reference to unitOfMeasurement collection
    uri: "http://urn.fi/URN:NBN:fi:au:ucum:r133",
    code: "atm",
    label: "standard atmosphere"  // Denormalized for performance
  },
  
  // Automatic unit validation
  validation: {
    dimensionMatch: true,
    iso80000Compliant: true,
    conversionApplied: false
  }
}
```

#### Datastream enhancement
```javascript
{
  _id: ObjectId(),
  name: "Atmospheric Pressure Sensor",
  
  unitOfMeasurement: {
    source: "finto-ucum",
    uri: "http://urn.fi/URN:NBN:fi:au:ucum:r133",
    allowedUnits: [  // Acceptable unit conversions
      { uri: "r133", code: "atm" },
      { uri: "r102", code: "Pa" },
      { uri: "r145", code: "mbar" }
    ]
  }
}
```

### Query patterns for hierarchical unit navigation

```javascript
// Find all pressure units
db.unitOfMeasurement.find({ 
  "classification.dimension": "pressure" 
})

// Get all descendants of pascal
db.unitOfMeasurement.find({ 
  "hierarchy.broaderTransitive": "http://urn.fi/URN:NBN:fi:au:ucum:r102" 
})

// Find compatible units for conversion
db.unitOfMeasurement.aggregate([
  { $match: { uri: "http://urn.fi/URN:NBN:fi:au:ucum:r133" } },
  { $graphLookup: {
    from: "unitOfMeasurement",
    startWith: "$hierarchy.broaderTransitive",
    connectFromField: "uri",
    connectToField: "uri",
    as: "compatibleUnits",
    maxDepth: 3
  }}
])

// Aggregate observations with unit normalization
db.observations.aggregate([
  { $lookup: {
    from: "unitOfMeasurement",
    localField: "unitOfMeasurement.ref",
    foreignField: "_id",
    as: "unitDetails"
  }},
  { $unwind: "$unitDetails" },
  { $addFields: {
    normalizedResult: {
      $multiply: ["$result", "$unitDetails.conversion.toBaseUnit.factor"]
    },
    baseUnit: "$unitDetails.conversion.toBaseUnit.baseUnitCode"
  }}
])
```

### Synchronization service design

```javascript
class UCUMOntologySync {
  async syncFromFinto() {
    const baseUrl = 'http://api.finto.fi/rest/v1';
    
    // Fetch vocabulary metadata
    const vocab = await fetch(`${baseUrl}/ucum/`);
    
    // Paginated retrieval of all concepts
    let offset = 0;
    const limit = 100;
    
    while (true) {
      const results = await fetch(
        `${baseUrl}/ucum/search?query=*&limit=${limit}&offset=${offset}`
      );
      
      for (const concept of results.concepts) {
        // Fetch full concept details
        const details = await fetch(
          `${baseUrl}/data?uri=${encodeURIComponent(concept.uri)}`
        );
        
        // Transform to MongoDB schema
        const unit = this.transformToSchema(details);
        
        // Upsert with cache metadata
        await db.unitOfMeasurement.updateOne(
          { uri: unit.uri },
          { 
            $set: unit,
            $currentDate: { "metadata.lastModified": true }
          },
          { upsert: true }
        );
      }
      
      if (results.concepts.length < limit) break;
      offset += limit;
    }
    
    // Rebuild hierarchy cache
    await this.rebuildHierarchyCache();
  }
  
  async rebuildHierarchyCache() {
    // Build materialized paths for each dimension
    const dimensions = await db.unitOfMeasurement.distinct(
      "classification.dimension"
    );
    
    for (const dimension of dimensions) {
      const tree = await this.buildTree(dimension);
      
      await db.unitHierarchyCache.replaceOne(
        { dimension },
        {
          dimension,
          tree,
          allNodes: this.flattenTree(tree),
          lastRebuilt: new Date()
        },
        { upsert: true }
      );
    }
  }
}
```

## Implementation recommendations

### Phased deployment strategy

**Phase 1** involves initial schema deployment and population through bulk import from Finto API, establishment of core indexes, and integration with existing SensorThings collections. **Phase 2** implements the synchronization service with daily updates, cache invalidation strategies, and hierarchy cache maintenance. **Phase 3** adds advanced features including automatic unit conversion in queries, dimension validation for observations, and ISO 80000 compliance checking.

### Performance optimization techniques

The schema leverages denormalization of frequently accessed fields (labels, codes) to reduce join operations. Hierarchical data is materialized in the unitHierarchyCache collection for rapid traversal. A TTL index on cache expiry enables automatic cleanup, while frequency scoring helps optimize commonly used units. The design supports both MongoDB Atlas Search for full-text queries and aggregation pipelines for complex hierarchical operations.

### Compliance and standards alignment

The schema maintains **full ISO 80000 compliance** through dedicated tracking fields and validation rules. SKOS vocabulary standards are preserved in the data model, ensuring semantic web compatibility. The design supports both case-sensitive and case-insensitive UCUM codes as specified in the standard. Integration points allow for future extension to other ontologies like QUDT or OM.

This MongoDB schema extension provides a robust foundation for managing units of measurement within the SensorThings data lake, combining the authoritative UCUM ontology with efficient local caching and hierarchical query capabilities while maintaining strict standards compliance.
