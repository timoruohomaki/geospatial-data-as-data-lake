# MongoDB Schema Implementation

This directory contains the complete MongoDB schema implementation for the SensorThings API data lake with OGC API Features integration.

## Quick Links

- [Main Documentation](./README.md) - Comprehensive setup and usage guide
- [Collection Scripts](./collections/) - Individual collection creation scripts
- [Query Examples](./queries/) - Sample queries for analytics and integration
- [Setup Scripts](./setup/) - Database and connection configuration

## Installation

```bash
# Install dependencies
npm install

# Configure environment
cp .env.template .env
# Edit .env with your MongoDB Atlas connection details

# Test connection
npm run test:connection

# Setup database
npm run setup:db

# Generate date dimension
npm run generate:dates
```

## Key Features

- **Time-Series Collections**: 90% storage reduction for observations
- **External Feature Integration**: Links to OGC API Features services
- **UCUM Ontology Support**: Hierarchical unit of measurement system
- **Pre-aggregated Analytics**: Hourly and daily summaries for dashboards
- **Geospatial Indexing**: Efficient location-based queries
- **Hierarchical Relationships**: Graph-like spatial navigation

## MongoDB Atlas Setup

1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Add your IP to the Network Access list
3. Create a database user with read/write permissions
4. Copy the connection string to your `.env` file
5. Run the setup scripts

## Support

For detailed documentation, see the [main README](./README.md) or check the [GitHub repository](https://github.com/timoruohomaki/geospatial-data-as-data-lake).
