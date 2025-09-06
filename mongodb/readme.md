# MongoDB Atlas & Compass Setup Instructions

## Part 1: MongoDB Atlas Setup

### 1. Create MongoDB Atlas Account and Cluster
1. Navigate to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up or log in to your account
3. Create a new project named `sensorthings-datalake`
4. Click **Build a Database**
5. Choose your cluster tier:
   - For development: **M0 (Free Tier)**
   - For production: **M10+** (paid tiers with better performance)
6. Select your cloud provider and region closest to your application
7. Name your cluster: `sensorthings-cluster`

### 2. Configure Network Access
1. Go to **Security → Network Access**
2. Click **Add IP Address**
3. For development: Click **Allow Access from Anywhere** (0.0.0.0/0)
4. For production: Add specific IP addresses or CIDR blocks
5. Click **Confirm**

### 3. Create Database User
1. Go to **Security → Database Access**
2. Click **Add New Database User**
3. Authentication Method: **Password**
4. Username: `sensorthings-admin`
5. Password: Generate a secure password
6. Database User Privileges: **Atlas Admin**
7. Click **Add User**

### 4. Get Connection String
1. Go to **Deployment → Database**
2. Click **Connect** on your cluster
3. Choose **Connect your application**
4. Driver: **Go** Version: **1.11 or later**
5. Copy the connection string (save for .env file)

## Part 2: Database Creation in MongoDB Atlas

### 1. Access Atlas UI Database Tools
1. Click **Browse Collections** from your cluster
2. You'll see the Data Explorer interface

### 2. Create Database
1. Click **Create Database**
2. Database Name: `sensorthings_datalake`
3. Collection Name: `_setup` (temporary, for initialization)
4. Additional Preferences:
   - [ ] Capped Collection (leave unchecked)
   - [ ] Custom Collation (leave unchecked)
   - [ ] Time Series Collection (leave unchecked for this one)
5. Click **Create**

## Part 3: Create Collections via MongoDB Atlas UI

### Time-Series Collection: observations

1. In Data Explorer, select `sensorthings_datalake` database
2. Click **Create Collection**
3. Collection Name: `observations`
4. Check **Time Series Collection**
5. Configure Time Series:
   - Time Field: `phenomenonTime`
   - Meta Field: `datastream`
   - Granularity: `seconds`
   - Expire After Seconds: `31536000` (optional, 1 year)
6. Click **Create**

### Standard Collections

For each of the following collections, repeat these steps:
1. Click **Create Collection** 
2. Enter the collection name
3. Leave all checkboxes unchecked
4. Click **Create**

**Collections to create:**
- `datastreams`
- `things`
- `sensors`
- `observed_properties`
- `locations`
- `historical_locations`
- `features_of_interest`
- `feature_associations`
- `external_feature_cache`
- `feature_hierarchies`
- `unit_of_measurement`
- `date_dimension`
- `hourly_aggregates`
- `daily_summaries`

## Part 4: Create Indexes via MongoDB Compass

### 1. Install and Connect MongoDB Compass
1. Download [MongoDB Compass](https://www.mongodb.com/products/compass)
2. Open Compass and paste your connection string
3. Replace `<password>` with your actual password
4. Click **Connect**

### 2. Create Indexes for observations Collection

Navigate to `sensorthings_datalake.observations` and go to **Indexes** tab:

1. **idx_datastream_time**
   ```json
   {
     "datastream.datastreamId": 1,
     "phenomenonTime": -1
   }
   ```
   Options: Background build

2. **idx_thing_time**
   ```json
   {
     "datastream.thingId": 1,
     "phenomenonTime": -1
   }
   ```

3. **idx_property_time**
   ```json
   {
     "datastream.observedPropertyId": 1,
     "phenomenonTime": -1
   }
   ```

4. **idx_foi_time**
   ```json
   {
     "featureOfInterestId": 1,
     "phenomenonTime": -1
   }
   ```

5. **idx_date_datastream**
   ```json
   {
     "date_key": 1,
     "datastream.datastreamId": 1
   }
   ```

6. **idx_location_2dsphere** (Geospatial)
   ```json
   {
     "location": "2dsphere"
   }
   ```
   Options: Sparse

### 3. Create Indexes for features_of_interest Collection

1. **idx_geometry_2dsphere**
   ```json
   {
     "feature.geometry": "2dsphere"
   }
   ```

2. **idx_external_feature_id**
   ```json
   {
     "externalFeatures.featureId": 1
   }
   ```

3. **idx_association_type**
   ```json
   {
     "externalFeatures.association.type": 1
   }
   ```

4. **idx_parent_foi**
   ```json
   {
     "hierarchy.parents.foiId": 1
   }
   ```

5. **Text Search Index**
   - Click **Create Index**
   - Choose **Text** index type
   - Fields: `name` (weight: 10), `description` (weight: 5)

### 4. Create Indexes for unit_of_measurement Collection

1. **Unique Index on URI**
   ```json
   {
     "uri": 1
   }
   ```
   Options: Unique

2. **idx_ucum_code**
   ```json
   {
     "ucumCode": 1
   }
   ```

3. **idx_dimension**
   ```json
   {
     "classification.dimension": 1
   }
   ```

4. **TTL Index for Cache Expiry**
   ```json
   {
     "metadata.cacheExpiry": 1
   }
   ```
   Options: TTL, expireAfterSeconds: 0

## Part 5: Schema Validation Setup

### Via MongoDB Compass

1. Select a collection (e.g., `features_of_interest`)
2. Go to **Validation** tab
3. Click **Update Validation**
4. Validation Level: **Moderate**
5. Validation Action: **Warn**
6. Add the JSON Schema (see schemas in Go project)

### Example Schema for features_of_interest:
```json
{
  "$jsonSchema": {
    "bsonType": "object",
    "required": ["_id", "name", "encodingType", "feature"],
    "properties": {
      "_id": {
        "bsonType": "string",
        "description": "Unique identifier"
      },
      "name": {
        "bsonType": "string"
      },
      "encodingType": {
        "bsonType": "string",
        "enum": ["application/vnd.geo+json", "application/gml+xml"]
      },
      "feature": {
        "bsonType": "object",
        "required": ["type"],
        "properties": {
          "type": {
            "bsonType": "string",
            "enum": ["Feature"]
          }
        }
      }
    }
  }
}
```

## Part 6: Performance Optimization Settings

### In MongoDB Atlas Console:

1. **Auto-scaling** (M10+ clusters):
   - Go to cluster configuration
   - Enable auto-scaling for compute and storage
   
2. **Backup Configuration**:
   - Go to **Backup** 
   - Enable continuous backup
   - Set snapshot schedule

3. **Performance Advisor**:
   - Go to **Performance Advisor**
   - Review and create suggested indexes
   
4. **Alerts**:
   - Go to **Alerts**
   - Configure alerts for:
     - High CPU usage (>80%)
     - High memory usage (>85%)
     - Slow queries (>100ms)

## Part 7: Initial Data Setup

### Via MongoDB Compass:

1. **Insert Sample Documents**:
   - Select collection
   - Click **Add Data** → **Insert Document**
   - Use the sample data from Go models

2. **Import Date Dimension**:
   - Generate date dimension CSV using Go tool
   - In Compass: **Add Data** → **Import File**
   - Select CSV file
   - Map fields appropriately

## Monitoring and Maintenance

### Regular Tasks:
1. **Weekly**: Check Performance Advisor recommendations
2. **Monthly**: Review index usage statistics
3. **Quarterly**: Analyze slow query logs
4. **Annually**: Review and optimize schema design

### Key Metrics to Monitor:
- Query execution time
- Index hit ratio
- Storage usage growth
- Connection pool utilization
- Operation counters (inserts/updates/deletes per second)
