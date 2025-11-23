# CLAUDE.md - AI Assistant Guide for Geospatial Data as Data Lake

> **Last Updated**: 2025-11-23
> **Repository**: geospatial-data-as-data-lake
> **Purpose**: Guide AI assistants working with this SensorThings API MongoDB data lake implementation

---

## Table of Contents

1. [Repository Overview](#repository-overview)
2. [Architecture & Design Principles](#architecture--design-principles)
3. [Directory Structure](#directory-structure)
4. [Technology Stack](#technology-stack)
5. [Data Model & Collections](#data-model--collections)
6. [Development Workflows](#development-workflows)
7. [Code Conventions](#code-conventions)
8. [Common Tasks](#common-tasks)
9. [Testing Guidelines](#testing-guidelines)
10. [Git Workflow](#git-workflow)
11. [Key Files Reference](#key-files-reference)
12. [Integration Patterns](#integration-patterns)

---

## Repository Overview

### Purpose

This repository implements a **MongoDB-based data lake** for the OGC SensorThings API v1.1 specification with full support for associating sensor observations with external geospatial features through the OGC API - Features standard.

### Key Features

- **Full OGC SensorThings API v1.1 compliance**
- **MongoDB time-series collections** for 90% storage reduction
- **Integration with external OGC API Features services**
- **Hierarchical spatial relationships** (graph-like structure)
- **Performance-optimized** with intelligent caching
- **Support for temporal, spatial, and semantic associations**
- **Data warehouse-style date dimensions**
- **UCUM (Unified Code for Units of Measure) ontology integration** via Finto API

### Design Principles

1. **Loose Coupling**: SensorThings and Features data lakes remain independent
2. **Performance First**: Leverages MongoDB time-series and strategic denormalization
3. **Standards Compliance**: Maintains compatibility with OGC specifications
4. **Semantic Richness**: Supports complex relationships similar to RDF/SKOS
5. **Scalability**: Designed for billions of observations
6. **Clean Architecture**: Repository pattern, dependency injection, modular design

---

## Architecture & Design Principles

### Architectural Layers

```
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                     │
│  - REST API (planned)                                    │
│  - CLI Tools                                             │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                    Service Layer                         │
│  - Business Logic                                        │
│  - Date Dimension Generation                             │
│  - UCUM Ontology Sync                                    │
│  - Feature Synchronization                               │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                   Repository Layer                       │
│  - Data Access Abstraction                               │
│  - Query Building                                        │
│  - Aggregation Pipelines                                 │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                    Data Layer                            │
│  - MongoDB Collections                                   │
│  - Time-Series Collections                               │
│  - Indexes                                               │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                  External Services                       │
│  - OGC API Features                                      │
│  - Finto API (UCUM Ontology)                            │
└─────────────────────────────────────────────────────────┘
```

### Core Data Lake Architecture

The system consists of three main layers:

1. **SensorThings Data Lake**: Core IoT observations and sensor metadata
2. **Association Layer**: Links between sensor data and geospatial features
3. **External Services**: OGC API Features and UCUM ontology services

---

## Directory Structure

```
geospatial-data-as-data-lake/
├── README.md                    # Main project documentation
├── FINTO.md                     # UCUM ontology integration details
├── LICENSE                      # MIT License
│
├── mongodb/                     # Node.js implementation
│   ├── package.json             # npm dependencies and scripts
│   ├── .env.template            # Environment variables template
│   ├── readme.md                # MongoDB Atlas setup guide
│   │
│   ├── setup/                   # Database initialization
│   │   ├── 00-connection.js     # Connection testing
│   │   ├── 01-create-database.js  # Database creation
│   │   └── 02-create-users.js   # User management
│   │
│   ├── collections/             # Collection schemas
│   │   ├── 01-observations.js   # Time-series collection
│   │   ├── 09-features-of-interest.js  # FOI schema
│   │   └── 13-unit-of-measurement.js   # Units schema
│   │
│   ├── queries/                 # Example queries
│   │   ├── time-series-queries.js  # Time-series examples
│   │   └── cross-lake-queries.js   # Cross-data-lake queries
│   │
│   └── data/                    # Data generation utilities
│       └── date-dimension-generator.js  # Date dimension tool
│
└── mongodb-go/                  # Go implementation (primary)
    ├── README.md                # Go implementation guide
    ├── go.mod                   # Go module definition
    ├── main.go                  # Application entry point
    ├── .env.example             # Environment configuration
    │
    ├── config/                  # Configuration management
    │   ├── config.go            # Configuration loading
    │   └── database.go          # Database connection setup
    │
    ├── models/                  # Data models
    │   ├── observation.go       # Observation model
    │   ├── feature_of_interest.go  # FOI model
    │   ├── unit_of_measurement.go  # Unit model
    │   └── date_dimension.go    # Date dimension model
    │
    ├── repository/              # Data access layer
    │   └── observation_repository.go  # Observation CRUD
    │
    ├── services/                # Business logic
    │   └── date_dimension_service.go  # Date generation
    │
    └── schemas/                 # MongoDB schemas
        └── observation.go       # Schema definitions
```

---

## Technology Stack

### Go Implementation (Primary)

- **Language**: Go 1.21+
- **MongoDB Driver**: `go.mongodb.org/mongo-driver`
- **Configuration**: `github.com/joho/godotenv`
- **Logging**: `github.com/sirupsen/logrus`
- **Validation**: Built-in struct tags

### Node.js Implementation (Legacy/Reference)

- **Runtime**: Node.js 16+
- **MongoDB Driver**: `mongodb` v6.3.0
- **HTTP Client**: `axios` v1.6.2
- **Scheduling**: `node-cron` v3.0.3
- **Logging**: `winston` v3.11.0

### Database

- **Primary**: MongoDB Atlas (or compatible)
- **Version**: MongoDB 5.0+ (for time-series collections)
- **Features Used**:
  - Time-series collections
  - Geospatial indexes (2dsphere)
  - Aggregation pipelines
  - TTL indexes
  - Schema validation

---

## Data Model & Collections

### Core SensorThings Collections

#### 1. Observations (Time-Series Collection)

**Purpose**: Store sensor observations with 90% storage reduction

**Key Fields**:
- `phenomenonTime` (time field): When observation occurred
- `datastream` (meta field): Embedded datastream metadata
- `result`: The observed value (can be number, string, object, etc.)
- `resultQuality`: Quality indicator (good, bad, uncertain, missing)
- `featureOfInterestId`: Link to FOI
- `date_key`: Foreign key to date dimension (YYYYMMDD format)
- `location`: GeoJSON geometry

**Time-Series Configuration**:
```javascript
{
  timeField: "phenomenonTime",
  metaField: "datastream",
  granularity: "seconds"
}
```

#### 2. Date Dimension

**Purpose**: Data warehouse-style temporal analytics

**Key Fields**:
- `_id`: Date key in YYYYMMDD format (e.g., 20250115)
- `year`, `quarter`, `month`, `week`, `day`
- `is_weekday`, `is_weekend`, `is_holiday`, `is_business_day`
- `fiscal_year`, `fiscal_quarter`, `fiscal_month`
- `iso_week`, `iso_year`, `iso_day_of_week`

#### 3. Features of Interest (Enhanced)

**Purpose**: Bridge between SensorThings and external geospatial features

**Key Features**:
- Standard SensorThings FOI fields
- `externalFeatures[]`: Array of external OGC API Features associations
- `hierarchy`: Parent-child spatial relationships
- `observationContext`: Metadata about observation purpose
- Cached external feature metadata

#### 4. Unit of Measurement

**Purpose**: UCUM ontology integration via Finto API

**Key Fields**:
- `uri`: External ontology URI
- `ucumCode`: UCUM notation
- `labels`: Multilingual labels (preferred and alternative)
- `hierarchy`: Broader/narrower relationships
- `conversion`: Base unit conversion factors
- `classification`: Dimension and category
- `iso80000`: ISO compliance tracking
- `metadata`: Cache management

### Supporting Collections

- **datastreams**: Measurement stream metadata
- **things**: IoT devices/platforms
- **sensors**: Instrument metadata
- **observed_properties**: Phenomena being measured
- **locations**: Geographic positions
- **historical_locations**: Movement tracking
- **feature_associations**: Feature relationship registry
- **external_feature_cache**: Cached OGC API Features
- **feature_hierarchies**: Spatial relationship graphs

### Pre-Aggregated Collections

- **hourly_aggregates**: Hourly statistics
- **daily_summaries**: Daily rollups

---

## Development Workflows

### Initial Setup

#### Go Implementation

```bash
cd mongodb-go
cp .env.example .env
# Edit .env with your MongoDB URI
go mod download
go run main.go
```

#### Node.js Implementation

```bash
cd mongodb
cp .env.template .env
# Edit .env with your MongoDB URI
npm install
npm run setup:db
```

### Database Initialization

**Option 1: Via MongoDB Atlas UI**
- Follow `mongodb/readme.md` for step-by-step UI setup

**Option 2: Programmatic (Go)**
```bash
cd mongodb-go
go run main.go  # Auto-creates collections and indexes
```

**Option 3: Scripts (Node.js)**
```bash
cd mongodb
mongosh setup/00-connection.js  # Test connection
mongosh setup/01-create-database.js  # Create database
mongosh setup/02-create-users.js  # Setup users
```

### Common Development Tasks

#### Generate Date Dimension

**Go**:
```go
service := services.NewDateDimensionService(db, logger)
dates, err := service.GenerateDateRange(ctx, startDate, endDate)
err = service.InsertDateDimension(ctx, dates)
```

**Node.js**:
```bash
npm run generate:dates
```

#### Sync UCUM Ontology

```bash
npm run sync:ucum
```

#### Sync External Features

```bash
npm run sync:features
```

#### Run Example Queries

```bash
npm run query:timeseries
npm run query:cross-lake
```

---

## Code Conventions

### Go Code Standards

#### File Organization

- **Maximum 100 lines per file** - Split larger files into focused modules
- One primary type/struct per file
- Related helper functions in same file
- Clear separation of concerns

#### Naming Conventions

- **Types/Structs**: PascalCase (e.g., `ObservationRepository`)
- **Functions/Methods**: PascalCase for exported, camelCase for private
- **Variables**: camelCase
- **Constants**: SCREAMING_SNAKE_CASE for exported, camelCase for private
- **Interfaces**: Suffix with `-er` when appropriate (e.g., `Fetcher`)

#### Error Handling

```go
// Always wrap errors with context
if err != nil {
    return fmt.Errorf("failed to insert observation: %w", err)
}

// Use custom error types when needed
type ValidationError struct {
    Field string
    Msg   string
}
```

#### Struct Tags

```go
type Observation struct {
    ID    primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
    Time  time.Time         `bson:"phenomenonTime" json:"phenomenonTime" validate:"required"`
}
```

#### Context Usage

- Always pass `context.Context` as first parameter
- Respect context cancellation
- Use `context.WithTimeout` for database operations

#### Dependency Injection

```go
// Constructor pattern
func NewObservationRepository(db *mongo.Database, logger *logrus.Logger) *ObservationRepository {
    return &ObservationRepository{
        collection: db.Collection("observations"),
        logger:     logger,
    }
}
```

### MongoDB Patterns

#### Collection Naming

- Use snake_case for collection names
- Plural nouns (e.g., `observations`, `features_of_interest`)

#### Index Strategy

```javascript
// Compound indexes for common queries
db.observations.createIndex({
    "datastream.datastreamId": 1,
    "phenomenonTime": -1
})

// Geospatial indexes
db.locations.createIndex({ "location": "2dsphere" })

// TTL indexes for cache expiry
db.external_feature_cache.createIndex(
    { "metadata.cacheExpiry": 1 },
    { expireAfterSeconds: 0 }
)
```

#### Aggregation Pipelines

- Use aggregation framework for complex queries
- Leverage `$lookup` for joins
- Use `$graphLookup` for hierarchical queries
- Apply `$match` early in pipeline
- Use indexes where possible

#### Schema Validation

- Use moderate validation level (warns but allows)
- Define required fields
- Use enums for constrained values
- Validate data types with BSON types

---

## Common Tasks

### Adding a New Collection

1. **Define Model** (`mongodb-go/models/`)
   ```go
   type NewEntity struct {
       ID   primitive.ObjectID `bson:"_id,omitempty"`
       Name string             `bson:"name" validate:"required"`
   }
   ```

2. **Create Repository** (`mongodb-go/repository/`)
   ```go
   type NewEntityRepository struct {
       collection *mongo.Collection
       logger     *logrus.Logger
   }
   ```

3. **Define Schema** (`mongodb-go/schemas/`)
   ```go
   func GetNewEntitySchema() bson.M {
       return bson.M{
           "$jsonSchema": bson.M{
               "bsonType": "object",
               "required": []string{"name"},
           },
       }
   }
   ```

4. **Create Indexes** (in main.go or setup script)
   ```go
   db.Collection("new_entities").Indexes().CreateOne(ctx,
       mongo.IndexModel{Keys: bson.D{{Key: "name", Value: 1}}})
   ```

### Querying Observations

#### By Time Range
```go
repo := repository.NewObservationRepository(db, logger)
observations, err := repo.FindByTimeRange(ctx, startTime, endTime, limit)
```

#### By Datastream
```go
observations, err := repo.FindByDatastream(ctx, datastreamID, startTime, endTime, limit)
```

#### Geospatial Query
```go
// Find observations near a point
pipeline := bson.A{
    bson.M{"$geoNear": bson.M{
        "near": bson.M{"type": "Point", "coordinates": []float64{-114.133, 51.08}},
        "distanceField": "distance",
        "maxDistance": 1000,
    }},
}
```

### Working with Features of Interest

#### Create FOI with External Association
```javascript
{
  _id: "FOI-001",
  name: "Building A - Room 101",
  encodingType: "application/vnd.geo+json",
  feature: { /* GeoJSON */ },
  externalFeatures: [
    {
      featureId: "parcels/items/12345",
      featureAPI: {
        baseUrl: "https://geodata.city.gov/ogcapi",
        collection: "parcels",
        itemId: "12345"
      },
      association: {
        type: "within",
        role: "container"
      }
    }
  ]
}
```

#### Query FOI by Hierarchy
```javascript
db.features_of_interest.find({
  "hierarchy.parents": {
    $elemMatch: {
      level: "building",
      foiId: "FOI-BUILDING-A"
    }
  }
})
```

### Unit Conversion

```javascript
// Find compatible units for conversion
db.unitOfMeasurement.aggregate([
  { $match: { uri: "http://urn.fi/URN:NBN:fi:au:ucum:r133" } },
  { $graphLookup: {
    from: "unitOfMeasurement",
    startWith: "$hierarchy.broaderTransitive",
    connectFromField: "uri",
    connectToField: "uri",
    as: "compatibleUnits"
  }}
])
```

---

## Testing Guidelines

### Unit Tests (Go)

```bash
go test ./...
go test -cover ./...
go test -v ./repository/...
```

### Test Structure

```go
func TestObservationRepository_Insert(t *testing.T) {
    // Setup
    db := setupTestDB(t)
    defer db.Disconnect(context.Background())

    repo := repository.NewObservationRepository(db.Database, logger)

    // Test case
    obs := &models.Observation{
        PhenomenonTime: time.Now(),
        Result: 23.5,
    }

    // Execute
    err := repo.Insert(context.Background(), obs)

    // Assert
    if err != nil {
        t.Errorf("Insert failed: %v", err)
    }
}
```

### Integration Testing

- Use MongoDB test containers or test database
- Clean up test data after each test
- Mock external API calls (OGC API Features, Finto API)

---

## Git Workflow

### Branch Strategy

- **Main branch**: Production-ready code
- **Feature branches**: `claude/claude-md-{session-id}-{unique-id}`
- Work on designated branch specified in task instructions

### Commit Guidelines

```bash
# Descriptive commit messages
git commit -m "Add UCUM ontology synchronization service

- Implement Finto API client
- Add caching mechanism
- Include error handling and retries"
```

### Push Workflow

```bash
# Always use -u flag for new branches
git push -u origin claude/claude-md-{session-id}-{unique-id}

# If network failure, retry with exponential backoff
# Retry sequence: 2s, 4s, 8s, 16s (up to 4 retries)
```

### Pull Request Process

1. Ensure all tests pass
2. Update documentation if needed
3. Create PR with descriptive summary
4. Include test plan in PR description

### Important Git Rules

- NEVER update git config
- NEVER run destructive operations (force push, hard reset)
- NEVER skip hooks (--no-verify)
- NEVER force push to main/master
- ALWAYS check authorship before amending
- ONLY commit when explicitly requested

---

## Key Files Reference

### Configuration Files

| File | Purpose |
|------|---------|
| `mongodb-go/.env.example` | Environment variables template (Go) |
| `mongodb/.env.template` | Environment variables template (Node.js) |
| `mongodb-go/go.mod` | Go module dependencies |
| `mongodb/package.json` | npm dependencies and scripts |

### Documentation Files

| File | Purpose |
|------|---------|
| `README.md` | Main repository documentation with full schema details |
| `FINTO.md` | UCUM ontology integration analysis |
| `mongodb/readme.md` | MongoDB Atlas setup guide |
| `mongodb-go/README.md` | Go implementation guide |
| `CLAUDE.md` | This file - AI assistant guide |

### Core Implementation Files (Go)

| File | Purpose |
|------|---------|
| `mongodb-go/main.go` | Application entry point |
| `mongodb-go/config/config.go` | Configuration management |
| `mongodb-go/config/database.go` | Database connection |
| `mongodb-go/models/observation.go` | Observation data model |
| `mongodb-go/repository/observation_repository.go` | Observation CRUD |
| `mongodb-go/services/date_dimension_service.go` | Date generation |
| `mongodb-go/schemas/observation.go` | MongoDB schemas |

### Node.js Reference Files

| File | Purpose |
|------|---------|
| `mongodb/setup/00-connection.js` | Connection testing |
| `mongodb/setup/01-create-database.js` | Database creation |
| `mongodb/collections/01-observations.js` | Observation schema |
| `mongodb/collections/09-features-of-interest.js` | FOI schema |
| `mongodb/collections/13-unit-of-measurement.js` | Unit schema |
| `mongodb/queries/time-series-queries.js` | Query examples |
| `mongodb/data/date-dimension-generator.js` | Date generation |

---

## Integration Patterns

### 1. Lazy Loading External Features

```javascript
// Check cache validity, fetch if expired
if (cached.lastFetched < expiryThreshold) {
    const freshData = await fetchFromOGCAPI(featureAPI);
    // Update cache
}
```

### 2. Hierarchical Query Pattern

```javascript
// Aggregate observations by building level
db.observations.aggregate([
    { $lookup: { from: "features_of_interest", ... } },
    { $graphLookup: { /* traverse hierarchy */ } },
    { $group: { /* aggregate by level */ } }
])
```

### 3. Cross-Data Lake Query

```javascript
// 1. Query external API for features
// 2. Find FOIs associated with features
// 3. Query observations for those FOIs
```

### 4. Feature Synchronization

```javascript
// Periodic sync with change detection
if (response.status === 304) {
    // Not modified, update sync time only
} else if (response.status === 200) {
    // Update cache with new data
}
```

### 5. UCUM Ontology Sync

```javascript
// Paginated retrieval from Finto API
while (hasMore) {
    const results = await fetch(`${fintoAPI}/search?offset=${offset}`);
    for (const concept of results) {
        // Transform and upsert
    }
}
// Rebuild hierarchy cache
```

---

## Performance Considerations

### Index Usage

- Always check query plans with `.explain()`
- Create compound indexes for common query patterns
- Use sparse indexes for optional fields
- Monitor index usage statistics

### Query Optimization

1. Use covered queries (all fields in index)
2. Leverage aggregation pipeline for complex analytics
3. Implement materialized views for frequently accessed aggregations
4. Use projection to limit returned fields
5. Batch operations for bulk inserts/updates

### Caching Strategy

- Cache external feature data with TTL
- Pre-aggregate hourly/daily summaries
- Use frequency scoring for optimization
- Implement lazy loading for external resources

### Storage Optimization

- Time-series collections: 90% storage reduction
- Strategic denormalization of frequently accessed data
- TTL indexes for automatic cleanup
- Compression enabled by default in MongoDB Atlas

---

## Common Issues & Solutions

### Issue: Time-Series Collection Not Created

**Solution**: Ensure MongoDB 5.0+ and use correct syntax:
```javascript
db.createCollection("observations", {
    timeseries: {
        timeField: "phenomenonTime",
        metaField: "datastream",
        granularity: "seconds"
    }
})
```

### Issue: Geospatial Queries Not Working

**Solution**: Ensure 2dsphere index exists and coordinates are [longitude, latitude]:
```javascript
db.locations.createIndex({ "location": "2dsphere" })
// Coordinates: [longitude, latitude] NOT [lat, lon]
```

### Issue: External API Sync Failures

**Solution**: Implement retry mechanism with exponential backoff:
```javascript
for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
        return await fetch(url);
    } catch (error) {
        await sleep(2 ** attempt * 1000);
    }
}
```

### Issue: Date Dimension Missing

**Solution**: Generate date dimension using service:
```bash
cd mongodb-go
go run main.go  # Auto-generates current year
# Or manually specify range in code
```

---

## Environment Variables Reference

### MongoDB Configuration

```bash
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/
DATABASE_NAME=sensorthings_datalake
MAX_POOL_SIZE=10
MIN_POOL_SIZE=5
CONNECTION_TIMEOUT_SECONDS=10
MAX_IDLE_TIME_MINUTES=10
```

### External APIs

```bash
OGCAPI_BASE_URL=https://geodata.city.gov/ogcapi
FINTO_API_URL=https://api.finto.fi
API_KEY=your_api_key_here
```

### Synchronization

```bash
SYNC_INTERVAL_MINUTES=60
CACHE_TTL_DAYS=30
FEATURE_SYNC_ENABLED=true
FEATURE_SYNC_BATCH_SIZE=100
UCUM_SYNC_ENABLED=true
UCUM_SYNC_SCHEDULE="0 0 1 * *"
```

### Application

```bash
APP_ENV=development
APP_PORT=8080
LOG_LEVEL=info
LOG_FORMAT=json
JWT_SECRET=your_secret_here
```

### Retention Policies

```bash
OBSERVATION_RETENTION_DAYS=365
CACHE_RETENTION_DAYS=30
```

---

## Additional Resources

### Standards & Specifications

- [OGC SensorThings API v1.1](https://docs.ogc.org/is/18-088/18-088.html)
- [OGC API - Features](https://docs.ogc.org/is/17-069r3/17-069r3.html)
- [UCUM Specification](https://ucum.org/)
- [ISO 80000](https://en.wikipedia.org/wiki/ISO_80000)
- [GeoJSON](https://geojson.org/)
- [SKOS](https://www.w3.org/2004/02/skos/)

### MongoDB Resources

- [Time-Series Collections](https://www.mongodb.com/docs/manual/core/timeseries-collections/)
- [Geospatial Queries](https://www.mongodb.com/docs/manual/geospatial-queries/)
- [Aggregation Pipeline](https://www.mongodb.com/docs/manual/aggregation/)
- [Schema Validation](https://www.mongodb.com/docs/manual/core/schema-validation/)

### Go Resources

- [Go MongoDB Driver](https://pkg.go.dev/go.mongodb.org/mongo-driver)
- [Effective Go](https://go.dev/doc/effective_go)
- [Go Code Review Comments](https://github.com/golang/go/wiki/CodeReviewComments)

---

## Notes for AI Assistants

### Before Making Changes

1. Read relevant documentation files first (README.md, FINTO.md)
2. Understand the data model and relationships
3. Check existing patterns in the codebase
4. Verify environment configuration requirements
5. Consider impact on both Go and Node.js implementations

### When Adding Features

1. Follow clean architecture principles
2. Maintain separation of concerns (models, repository, services)
3. Add appropriate error handling and logging
4. Update documentation
5. Consider MongoDB index requirements
6. Ensure OGC standards compliance

### When Fixing Bugs

1. Understand the root cause before making changes
2. Check if issue affects both implementations
3. Add tests to prevent regression
4. Update documentation if behavior changes
5. Consider backward compatibility

### Communication

- Be concise and technical
- Reference specific files with line numbers when discussing code
- Explain MongoDB-specific patterns when needed
- Highlight OGC standard compliance requirements
- Note performance implications of changes

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-11-23 | Initial CLAUDE.md creation |

---

**Maintained by**: Timo Ruohomäki
**License**: MIT
**Repository**: https://github.com/timoruohomaki/geospatial-data-as-data-lake
