package config

import (
	"context"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.mongodb.org/mongo-driver/mongo/readpref"
	"github.com/sirupsen/logrus"
)

// Database represents a MongoDB database connection
type Database struct {
	Client   *mongo.Client
	Database *mongo.Database
	Config   *MongoDBConfig
	logger   *logrus.Logger
}

// NewDatabase creates a new database connection
func NewDatabase(cfg *MongoDBConfig, logger *logrus.Logger) (*Database, error) {
	if logger == nil {
		logger = logrus.New()
	}

	clientOptions := options.Client().
		ApplyURI(cfg.URI).
		SetMaxPoolSize(cfg.MaxPoolSize).
		SetMinPoolSize(cfg.MinPoolSize).
		SetConnectTimeout(cfg.ConnectionTimeout).
		SetMaxConnIdleTime(cfg.MaxIdleTime).
		SetRetryWrites(cfg.RetryWrites)

	ctx, cancel := context.WithTimeout(context.Background(), cfg.ConnectionTimeout)
	defer cancel()

	client, err := mongo.Connect(ctx, clientOptions)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to MongoDB: %w", err)
	}

	// Ping the database to verify connection
	if err := client.Ping(ctx, readpref.Primary()); err != nil {
		return nil, fmt.Errorf("failed to ping MongoDB: %w", err)
	}

	logger.Info("Successfully connected to MongoDB")

	return &Database{
		Client:   client,
		Database: client.Database(cfg.DatabaseName),
		Config:   cfg,
		logger:   logger,
	}, nil
}

// Disconnect closes the database connection
func (db *Database) Disconnect(ctx context.Context) error {
	if err := db.Client.Disconnect(ctx); err != nil {
		return fmt.Errorf("failed to disconnect from MongoDB: %w", err)
	}
	db.logger.Info("Disconnected from MongoDB")
	return nil
}

// GetCollection returns a collection from the database
func (db *Database) GetCollection(name string) *mongo.Collection {
	return db.Database.Collection(name)
}

// HealthCheck performs a health check on the database
func (db *Database) HealthCheck(ctx context.Context) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if err := db.Client.Ping(ctx, readpref.Primary()); err != nil {
		return fmt.Errorf("database health check failed: %w", err)
	}
	return nil
}

// CreateIndexes creates indexes for all collections
func (db *Database) CreateIndexes(ctx context.Context) error {
	// This would typically be called during initialization
	// Indexes are defined in the schemas package
	db.logger.Info("Creating database indexes...")
	
	// The actual index creation would be delegated to schema-specific functions
	// Example: schemas.CreateObservationIndexes(db.GetCollection("observations"))
	
	return nil
}

// Stats returns database statistics
func (db *Database) Stats(ctx context.Context) (*mongo.DatabaseSpecification, error) {
	result, err := db.Database.ListCollections(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to list collections: %w", err)
	}
	defer result.Close(ctx)

	// Get database stats
	var stats mongo.DatabaseSpecification
	for result.Next(ctx) {
		if err := result.Decode(&stats); err != nil {
			return nil, fmt.Errorf("failed to decode stats: %w", err)
		}
	}

	return &stats, nil
}
