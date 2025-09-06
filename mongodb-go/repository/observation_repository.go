package repository

import (
	"context"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"github.com/timoruohomaki/geospatial-data-as-data-lake/mongodb-go/models"
)

// ObservationRepository handles observation data operations
type ObservationRepository struct {
	collection *mongo.Collection
	database   *mongo.Database
}

// NewObservationRepository creates a new observation repository
func NewObservationRepository(db *mongo.Database) *ObservationRepository {
	return &ObservationRepository{
		collection: db.Collection("observations"),
		database:   db,
	}
}

// Insert adds a new observation
func (r *ObservationRepository) Insert(ctx context.Context, obs *models.Observation) error {
	// Add date key and hour bucket
	obs.DateKey = models.GetDateKey(obs.PhenomenonTime)
	obs.HourBucket = models.GetHourBucket(obs.PhenomenonTime)

	_, err := r.collection.InsertOne(ctx, obs)
	if err != nil {
		return fmt.Errorf("failed to insert observation: %w", err)
	}
	return nil
}

// InsertMany adds multiple observations
func (r *ObservationRepository) InsertMany(ctx context.Context, observations []models.Observation) error {
	// Prepare documents for insertion
	docs := make([]interface{}, len(observations))
	for i, obs := range observations {
		obs.DateKey = models.GetDateKey(obs.PhenomenonTime)
		obs.HourBucket = models.GetHourBucket(obs.PhenomenonTime)
		docs[i] = obs
	}

	opts := options.InsertMany().SetOrdered(false)
	_, err := r.collection.InsertMany(ctx, docs, opts)
	if err != nil {
		return fmt.Errorf("failed to insert observations: %w", err)
	}
	return nil
}

// FindByDatastream retrieves observations for a datastream
func (r *ObservationRepository) FindByDatastream(ctx context.Context, datastreamID string, 
	startTime, endTime time.Time, limit int64) ([]models.Observation, error) {
	
	filter := bson.M{
		"datastream.datastreamId": datastreamID,
		"phenomenonTime": bson.M{
			"$gte": startTime,
			"$lt":  endTime,
		},
	}

	opts := options.Find().
		SetSort(bson.D{{Key: "phenomenonTime", Value: -1}}).
		SetLimit(limit)

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to find observations: %w", err)
	}
	defer cursor.Close(ctx)

	var observations []models.Observation
	if err := cursor.All(ctx, &observations); err != nil {
		return nil, fmt.Errorf("failed to decode observations: %w", err)
	}

	return observations, nil
}

// GetHourlyStatistics calculates hourly statistics
func (r *ObservationRepository) GetHourlyStatistics(ctx context.Context, 
	datastreamID string, startTime, endTime time.Time) ([]models.ObservationStats, error) {
	
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"datastream.datastreamId": datastreamID,
			"phenomenonTime": bson.M{
				"$gte": startTime,
				"$lt":  endTime,
			},
		}}},
		{{Key: "$group", Value: bson.M{
			"_id": bson.M{
				"date": bson.M{"$dateToString": bson.M{
					"format": "%Y-%m-%d",
					"date":   "$phenomenonTime",
				}},
				"hour": bson.M{"$hour": "$phenomenonTime"},
			},
			"average": bson.M{"$avg": "$result"},
			"min":     bson.M{"$min": "$result"},
			"max":     bson.M{"$max": "$result"},
			"stdDev":  bson.M{"$stdDevPop": "$result"},
			"count":   bson.M{"$sum": 1},
			"firstObservation": bson.M{"$min": "$phenomenonTime"},
			"lastObservation":  bson.M{"$max": "$phenomenonTime"},
		}}},
		{{Key: "$sort", Value: bson.D{
			{Key: "_id.date", Value: 1},
			{Key: "_id.hour", Value: 1},
		}}},
	}

	cursor, err := r.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, fmt.Errorf("failed to aggregate statistics: %w", err)
	}
	defer cursor.Close(ctx)

	var stats []models.ObservationStats
	if err := cursor.All(ctx, &stats); err != nil {
		return nil, fmt.Errorf("failed to decode statistics: %w", err)
	}

	return stats, nil
}

// FindNearLocation finds observations near a geographic location
func (r *ObservationRepository) FindNearLocation(ctx context.Context, 
	longitude, latitude, maxDistance float64, limit int64) ([]models.Observation, error) {
	
	filter := bson.M{
		"location": bson.M{
			"$near": bson.M{
				"$geometry": bson.M{
					"type":        "Point",
					"coordinates": []float64{longitude, latitude},
				},
				"$maxDistance": maxDistance,
			},
		},
	}

	opts := options.Find().SetLimit(limit)
	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to find observations near location: %w", err)
	}
	defer cursor.Close(ctx)

	var observations []models.Observation
	if err := cursor.All(ctx, &observations); err != nil {
		return nil, fmt.Errorf("failed to decode observations: %w", err)
	}

	return observations, nil
}

// DeleteOldObservations removes observations older than the specified date
func (r *ObservationRepository) DeleteOldObservations(ctx context.Context, before time.Time) (int64, error) {
	filter := bson.M{
		"phenomenonTime": bson.M{"$lt": before},
	}

	result, err := r.collection.DeleteMany(ctx, filter)
	if err != nil {
		return 0, fmt.Errorf("failed to delete old observations: %w", err)
	}

	return result.DeletedCount, nil
}
