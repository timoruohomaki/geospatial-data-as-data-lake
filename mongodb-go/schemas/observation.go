package schemas

import (
	"context"
	"fmt"
	
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"github.com/sirupsen/logrus"
)

// ObservationSchema defines the validation schema for observations
var ObservationSchema = bson.M{
	"$jsonSchema": bson.M{
		"bsonType": "object",
		"required": []string{"phenomenonTime", "result", "datastream"},
		"properties": bson.M{
			"phenomenonTime": bson.M{
				"bsonType":    "date",
				"description": "Time when the observation occurred",
			},
			"datastream": bson.M{
				"bsonType": "object",
				"required": []string{"datastreamId"},
				"properties": bson.M{
					"datastreamId":       bson.M{"bsonType": "string"},
					"thingId":           bson.M{"bsonType": "string"},
					"sensorId":          bson.M{"bsonType": "string"},
					"observedPropertyId": bson.M{"bsonType": "string"},
					"locationId":        bson.M{"bsonType": "string"},
					"unitOfMeasurement": bson.M{
						"bsonType": "object",
						"properties": bson.M{
							"name":       bson.M{"bsonType": "string"},
							"symbol":     bson.M{"bsonType": "string"},
							"definition": bson.M{"bsonType": "string"},
						},
					},
				},
			},
			"result": bson.M{
				"bsonType":    []string{"number", "string", "bool", "object", "array"},
				"description": "The observation result value",
			},
			"resultTime": bson.M{
				"bsonType":    "date",
				"description": "Time when the result was generated",
			},
			"resultQuality": bson.M{
				"bsonType":    "string",
				"enum":        []string{"good", "bad", "uncertain", "missing"},
				"description": "Quality indicator for the observation",
			},
			"validTime": bson.M{
				"bsonType": "object",
				"properties": bson.M{
					"start": bson.M{"bsonType": "date"},
					"end":   bson.M{"bsonType": []string{"date", "null"}},
				},
			},
			"featureOfInterestId": bson.M{
				"bsonType":    "string",
				"description": "Reference to the feature of interest",
			},
			"parameters": bson.M{
				"bsonType":    "object",
				"description": "Additional observation parameters",
			},
			"date_key": bson.M{
				"bsonType":    "int",
				"description": "Date dimension key (YYYYMMDD format)",
			},
			"hour_bucket": bson.M{
				"bsonType":    "int",
				"minimum":     0,
				"maximum":     23,
				"description": "Hour of the day for bucketing",
			},
			"location": bson.M{
				"bsonType": "object",
				"properties": bson.M{
					"type": bson.M{
						"bsonType": "string",
						"enum":     []string{"Point", "Polygon", "LineString"},
					},
					"coordinates": bson.M{
						"bsonType": "array",
					},
				},
			},
		},
	},
}

// CreateObservationIndexes creates indexes for the observations collection
func CreateObservationIndexes(ctx context.Context, collection *mongo.Collection, logger *logrus.Logger) error {
	indexes := []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "datastream.datastreamId", Value: 1}, {Key: "phenomenonTime", Value: -1}},
			Options: options.Index().SetName("idx_datastream_time").SetBackground(true),
		},
		{
			Keys:    bson.D{{Key: "datastream.thingId", Value: 1}, {Key: "phenomenonTime", Value: -1}},
			Options: options.Index().SetName("idx_thing_time").SetBackground(true),
		},
		{
			Keys:    bson.D{{Key: "datastream.observedPropertyId", Value: 1}, {Key: "phenomenonTime", Value: -1}},
			Options: options.Index().SetName("idx_property_time").SetBackground(true),
		},
		{
			Keys:    bson.D{{Key: "featureOfInterestId", Value: 1}, {Key: "phenomenonTime", Value: -1}},
			Options: options.Index().SetName("idx_foi_time").SetBackground(true),
		},
		{
			Keys:    bson.D{{Key: "date_key", Value: 1}, {Key: "datastream.datastreamId", Value: 1}},
			Options: options.Index().SetName("idx_date_datastream").SetBackground(true),
		},
		{
			Keys:    bson.M{"location": "2dsphere"},
			Options: options.Index().SetName("idx_location_2dsphere").SetBackground(true).SetSparse(true),
		},
		{
			Keys:    bson.D{{Key: "resultQuality", Value: 1}},
			Options: options.Index().SetName("idx_quality").SetBackground(true).SetSparse(true),
		},
	}

	for _, index := range indexes {
		if _, err := collection.Indexes().CreateOne(ctx, index); err != nil {
			// Check if index already exists
			if !mongo.IsDuplicateKeyError(err) {
				return fmt.Errorf("failed to create index %s: %w", *index.Options.Name, err)
			}
			if logger != nil {
				logger.Warnf("Index %s already exists", *index.Options.Name)
			}
		} else if logger != nil {
			logger.Infof("Created index: %s", *index.Options.Name)
		}
	}

	return nil
}

// CreateObservationCollection creates a time-series collection for observations
func CreateObservationCollection(ctx context.Context, db *mongo.Database, logger *logrus.Logger) error {
	// Time-series collection options
	opts := options.CreateCollection().
		SetTimeSeriesOptions(options.TimeSeries().
			SetTimeField("phenomenonTime").
			SetMetaField("datastream").
			SetGranularity("seconds")).
		SetValidator(ObservationSchema).
		SetValidationLevel("moderate").
		SetValidationAction("warn")

	// Optional: Set TTL for automatic data expiration (1 year)
	// opts.SetExpireAfterSeconds(31536000)

	if err := db.CreateCollection(ctx, "observations", opts); err != nil {
		// Check if collection already exists
		if !mongo.IsDuplicateKeyError(err) {
			return fmt.Errorf("failed to create observations collection: %w", err)
		}
		if logger != nil {
			logger.Warn("Observations collection already exists")
		}
		return nil
	}

	if logger != nil {
		logger.Info("Created time-series collection: observations")
	}

	// Create indexes
	collection := db.Collection("observations")
	return CreateObservationIndexes(ctx, collection, logger)
}
