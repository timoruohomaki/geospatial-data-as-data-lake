# MongoDB Go Implementation for SensorThings Data Lake

## Overview

This is a production-grade Go implementation of the MongoDB-based SensorThings API data lake with OGC API Features integration. The project has been refactored from Node.js to Go with clean architecture, robust error handling, and modular design.

## Project Structure

```
mongodb-go/
├── config/           # Configuration and database connection
├── models/           # Data models and structures
├── schemas/          # MongoDB schemas and index definitions
├── repository/       # Data access layer
├── services/         # Business logic layer
├── docs/            # Documentation and setup guides
├── .env.example     # Environment configuration template
├── go.mod           # Go module dependencies
└── main.go          # Application entry point
```

## Prerequisites

- Go 1.21 or higher
- MongoDB Atlas account or local MongoDB instance
- Network connectivity to MongoDB cluster

## Installation

1. Clone the repository:
```bash
git clone https://github.com/timoruohomaki/geospatial-data-as-data-lake.git
cd geospatial-data-as-data-lake/mongodb-go
```

2. Install dependencies:
```bash
go mod download
```

3. Configure environment:
```bash
cp .env.example .env
# Edit .env with your MongoDB connection details
```

## Database Setup

### Option 1: MongoDB Atlas UI

Follow the detailed instructions in `docs/mongodb-atlas-setup.md` to:
1. Create your MongoDB Atlas cluster
2. Set up collections via the UI
3. Configure indexes using MongoDB Compass

### Option 2: Programmatic Setup

Run the main application to automatically create collections and indexes:
```bash
go run main.go
```

## Configuration

The application uses environment variables for configuration:

```env
# MongoDB Connection
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
DATABASE_NAME=sensorthings_datalake

# External APIs
OGCAPI_BASE_URL=https://geodata.city.gov/ogcapi
FINTO_API_URL=https://api.finto.fi

# Performance
MAX_POOL_SIZE=10
MIN_POOL_SIZE=5
CONNECTION_TIMEOUT_SECONDS=10
```

## Usage Examples

### 1. Initialize Database Connection

```go
import (
    "github.com/timoruohomaki/geospatial-data-as-data-lake/mongodb-go/config"
)

// Load configuration
cfg, err := config.Load()
if err != nil {
    log.Fatal(err)
}

// Connect to database
db, err := config.NewDatabase(&cfg.MongoDB, logger)
if err != nil {
    log.Fatal(err)
}
defer db.Disconnect(context.Background())
```

### 2. Insert Observations

```go
import (
    "github.com/timoruohomaki/geospatial-data-as-data-lake/mongodb-go/repository"
    "github.com/timoruohomaki/geospatial-data-as-data-lake/mongodb-go/models"
)

repo := repository.NewObservationRepository(db.Database)

observation := models.Observation{
    PhenomenonTime: time.Now(),
    Datastream: models.DatastreamMeta{
        DatastreamID: "DS-001",
        ThingID: "THING-001",
    },
    Result: 23.5,
    ResultQuality: "good",
}

err := repo.Insert(context.Background(), &observation)
```

### 3. Query Time-Series Data

```go
// Find observations for a datastream
observations, err := repo.FindByDatastream(
    ctx, 
    "DS-001", 
    startTime, 
    endTime, 
    100, // limit
)

// Get hourly statistics
stats, err := repo.GetHourlyStatistics(
    ctx,
    "DS-001",
    startTime,
    endTime,
)
```

### 4. Generate Date Dimension

```go
import (
    "github.com/timoruohomaki/geospatial-data-as-data-lake/mongodb-go/services"
)

service := services.NewDateDimensionService(db.Database, logger)

// Generate dates for 2025
startDate := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
endDate := time.Date(2025, 12, 31, 0, 0, 0, 0, time.UTC)

dates, err := service.GenerateDateRange(ctx, startDate, endDate)
if err != nil {
    log.Fatal(err)
}

// Insert into database
err = service.InsertDateDimension(ctx, dates)
```

## Key Features

### Time-Series Collections
- 90% storage reduction for observations
- Automatic time-based bucketing
- Optimized for time-range queries

### Clean Architecture
- Repository pattern for data access
- Service layer for business logic
- Dependency injection
- Modular design (files < 100 lines)

### Error Handling
- Comprehensive error wrapping
- Context-aware logging
- Graceful degradation
- Retry mechanisms

### Performance Optimizations
- Connection pooling
- Batch operations
- Background index creation
- Efficient aggregation pipelines

## MongoDB Schema Validation

Schemas are defined programmatically and can be applied via MongoDB Compass:

```javascript
// Example: Observations schema
{
  "$jsonSchema": {
    "bsonType": "object",
    "required": ["phenomenonTime", "result", "datastream"],
    "properties": {
      "phenomenonTime": {
        "bsonType": "date",
        "description": "Time when the observation occurred"
      },
      "datastream": {
        "bsonType": "object",
        "required": ["datastreamId"],
        "properties": {
          "datastreamId": { "bsonType": "string" }
        }
      },
      "result": {
        "bsonType": ["number", "string", "bool", "object", "array"]
      }
    }
  }
}
```

## Testing

Run unit tests:
```bash
go test ./...
```

Run with coverage:
```bash
go test -cover ./...
```

## Deployment

### Docker

```dockerfile
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY . .
RUN go build -o sensorthings-datalake

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/sensorthings-datalake .
CMD ["./sensorthings-datalake"]
```

### Production Considerations

1. **Security**:
   - Use connection string with TLS/SSL
   - Implement authentication middleware
   - Rotate credentials regularly

2. **Monitoring**:
   - Enable MongoDB Atlas monitoring
   - Implement health checks
   - Set up alerting

3. **Scaling**:
   - Use MongoDB Atlas auto-scaling
   - Implement caching layer
   - Consider read replicas

## Migration from Node.js

Key differences from the Node.js implementation:

1. **Type Safety**: Go provides compile-time type checking
2. **Performance**: Better memory management and concurrency
3. **Dependencies**: Fewer external dependencies required
4. **Error Handling**: Explicit error handling vs. try-catch
5. **Deployment**: Single binary vs. Node.js runtime

## Support

For issues or questions:
- Check the [MongoDB Atlas Setup Guide](docs/mongodb-atlas-setup.md)
- Review the [API Documentation](docs/api.md)
- Open an issue on GitHub

## License

MIT License - See LICENSE file for details
