package main

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/sirupsen/logrus"
	"github.com/timoruohomaki/geospatial-data-as-data-lake/mongodb-go/config"
	"github.com/timoruohomaki/geospatial-data-as-data-lake/mongodb-go/models"
	"github.com/timoruohomaki/geospatial-data-as-data-lake/mongodb-go/repository"
	"github.com/timoruohomaki/geospatial-data-as-data-lake/mongodb-go/schemas"
	"github.com/timoruohomaki/geospatial-data-as-data-lake/mongodb-go/services"
)

func main() {
	// Initialize logger
	logger := setupLogger()
	
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		logger.Fatalf("Failed to load configuration: %v", err)
	}
	
	// Create database connection
	db, err := config.NewDatabase(&cfg.MongoDB, logger)
	if err != nil {
		logger.Fatalf("Failed to connect to database: %v", err)
	}
	defer func() {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := db.Disconnect(ctx); err != nil {
			logger.Errorf("Failed to disconnect from database: %v", err)
		}
	}()
	
	// Create context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	
	// Initialize schemas (create collections and indexes)
	if err := initializeSchemas(ctx, db, logger); err != nil {
		logger.Errorf("Failed to initialize schemas: %v", err)
	}
	
	// Example: Generate and insert date dimension
	if err := generateDateDimension(ctx, db, logger); err != nil {
		logger.Errorf("Failed to generate date dimension: %v", err)
	}
	
	// Example: Insert sample observations
	if err := insertSampleObservations(ctx, db, logger); err != nil {
		logger.Errorf("Failed to insert sample observations: %v", err)
	}
	
	// Example: Query observations
	if err := queryObservations(ctx, db, logger); err != nil {
		logger.Errorf("Failed to query observations: %v", err)
	}
	
	logger.Info("Application completed successfully")
}

// setupLogger configures the logger
func setupLogger() *logrus.Logger {
	logger := logrus.New()
	
	// Set log level from environment
	level := os.Getenv("LOG_LEVEL")
	switch level {
	case "debug":
		logger.SetLevel(logrus.DebugLevel)
	case "warn":
		logger.SetLevel(logrus.WarnLevel)
	case "error":
		logger.SetLevel(logrus.ErrorLevel)
	default:
		logger.SetLevel(logrus.InfoLevel)
	}
	
	// Set log format
	format := os.Getenv("LOG_FORMAT")
	if format == "json" {
		logger.SetFormatter(&logrus.JSONFormatter{
			TimestampFormat: time.RFC3339,
		})
	} else {
		logger.SetFormatter(&logrus.TextFormatter{
			TimestampFormat: time.RFC3339,
			FullTimestamp:   true,
		})
	}
	
	return logger
}

// initializeSchemas creates collections and indexes
func initializeSchemas(ctx context.Context, db *config.Database, logger *logrus.Logger) error {
	logger.Info("Initializing database schemas...")
	
	// Create observations time-series collection
	if err := schemas.CreateObservationCollection(ctx, db.Database, logger); err != nil {
		return fmt.Errorf("failed to create observation collection: %w", err)
	}
	
	// Create other collections would go here
	// schemas.CreateFeatureOfInterestCollection(ctx, db.Database, logger)
	// schemas.CreateUnitOfMeasurementCollection(ctx, db.Database, logger)
	
	logger.Info("Database schemas initialized successfully")
	return nil
}

// generateDateDimension generates and inserts date dimension data
func generateDateDimension(ctx context.Context, db *config.Database, logger *logrus.Logger) error {
	logger.Info("Generating date dimension...")
	
	service := services.NewDateDimensionService(db.Database, logger)
	
	// Generate dates for 2025
	startDate := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	endDate := time.Date(2025, 12, 31, 0, 0, 0, 0, time.UTC)
	
	dates, err := service.GenerateDateRange(ctx, startDate, endDate)
	if err != nil {
		return fmt.Errorf("failed to generate date range: %w", err)
	}
	
	// Insert into database
	if err := service.InsertDateDimension(ctx, dates); err != nil {
		return fmt.Errorf("failed to insert date dimension: %w", err)
	}
	
	logger.Infof("Successfully generated and inserted %d date records", len(dates))
	return nil
}

// insertSampleObservations inserts sample observation data
func insertSampleObservations(ctx context.Context, db *config.Database, logger *logrus.Logger) error {
	logger.Info("Inserting sample observations...")
	
	repo := repository.NewObservationRepository(db.Database)
	
	// Create sample observations
	observations := []models.Observation{
		{
			PhenomenonTime: time.Now().UTC(),
			Datastream: models.DatastreamMeta{
				DatastreamID:       "DS-001",
				ThingID:           "THING-001",
				SensorID:          "SENSOR-001",
				ObservedPropertyID: "PROP-001",
				LocationID:        "LOC-001",
				UnitOfMeasurement: &models.UnitOfMeasure{
					Name:       "degree Celsius",
					Symbol:     "°C",
					Definition: "http://unitsofmeasure.org/ucum.html#para-30",
				},
			},
			Result:        23.5,
			ResultTime:    func() *time.Time { t := time.Now().UTC(); return &t }(),
			ResultQuality: "good",
			FeatureOfInterestID: "FOI-001",
			Parameters: map[string]interface{}{
				"calibrationDate": time.Date(2024, 12, 1, 0, 0, 0, 0, time.UTC),
				"accuracy":        0.1,
			},
			Location: &models.GeoJSON{
				Type:        "Point",
				Coordinates: []float64{-114.133, 51.08},
			},
		},
	}
	
	// Insert observations
	if err := repo.InsertMany(ctx, observations); err != nil {
		return fmt.Errorf("failed to insert observations: %w", err)
	}
	
	logger.Infof("Successfully inserted %d sample observations", len(observations))
	return nil
}

// queryObservations demonstrates various query patterns
func queryObservations(ctx context.Context, db *config.Database, logger *logrus.Logger) error {
	logger.Info("Querying observations...")
	
	repo := repository.NewObservationRepository(db.Database)
	
	// Query by datastream
	startTime := time.Now().Add(-24 * time.Hour)
	endTime := time.Now()
	
	observations, err := repo.FindByDatastream(ctx, "DS-001", startTime, endTime, 100)
	if err != nil {
		return fmt.Errorf("failed to query observations: %w", err)
	}
	
	logger.Infof("Found %d observations for datastream DS-001", len(observations))
	
	// Get hourly statistics
	stats, err := repo.GetHourlyStatistics(ctx, "DS-001", startTime, endTime)
	if err != nil {
		return fmt.Errorf("failed to get statistics: %w", err)
	}
	
	logger.Infof("Calculated statistics for %d hourly periods", len(stats))
	
	// Query near location
	nearObs, err := repo.FindNearLocation(ctx, -114.133, 51.08, 1000, 10)
	if err != nil {
		logger.Warnf("Failed to find observations near location: %v", err)
	} else {
		logger.Infof("Found %d observations near location", len(nearObs))
	}
	
	return nil
}
