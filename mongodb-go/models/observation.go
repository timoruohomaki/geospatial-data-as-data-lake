package models

import (
	"time"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Observation represents a time-series observation
type Observation struct {
	ID               primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	PhenomenonTime   time.Time         `bson:"phenomenonTime" json:"phenomenonTime" validate:"required"`
	Datastream       DatastreamMeta    `bson:"datastream" json:"datastream" validate:"required"`
	Result           interface{}       `bson:"result" json:"result" validate:"required"`
	ResultTime       *time.Time        `bson:"resultTime,omitempty" json:"resultTime,omitempty"`
	ResultQuality    string            `bson:"resultQuality,omitempty" json:"resultQuality,omitempty" validate:"omitempty,oneof=good bad uncertain missing"`
	ValidTime        *ValidTime        `bson:"validTime,omitempty" json:"validTime,omitempty"`
	FeatureOfInterestID string         `bson:"featureOfInterestId,omitempty" json:"featureOfInterestId,omitempty"`
	Parameters       map[string]interface{} `bson:"parameters,omitempty" json:"parameters,omitempty"`
	DateKey          int               `bson:"date_key,omitempty" json:"dateKey,omitempty"`
	HourBucket       int               `bson:"hour_bucket,omitempty" json:"hourBucket,omitempty" validate:"min=0,max=23"`
	Location         *GeoJSON          `bson:"location,omitempty" json:"location,omitempty"`
}

// DatastreamMeta contains metadata for time-series collection
type DatastreamMeta struct {
	DatastreamID      string           `bson:"datastreamId" json:"datastreamId" validate:"required"`
	ThingID           string           `bson:"thingId,omitempty" json:"thingId,omitempty"`
	SensorID          string           `bson:"sensorId,omitempty" json:"sensorId,omitempty"`
	ObservedPropertyID string          `bson:"observedPropertyId,omitempty" json:"observedPropertyId,omitempty"`
	LocationID        string           `bson:"locationId,omitempty" json:"locationId,omitempty"`
	UnitOfMeasurement *UnitOfMeasure   `bson:"unitOfMeasurement,omitempty" json:"unitOfMeasurement,omitempty"`
}

// UnitOfMeasure represents a unit of measurement
type UnitOfMeasure struct {
	Name       string `bson:"name" json:"name"`
	Symbol     string `bson:"symbol" json:"symbol"`
	Definition string `bson:"definition,omitempty" json:"definition,omitempty"`
}

// ValidTime represents the validity period of an observation
type ValidTime struct {
	Start time.Time  `bson:"start" json:"start"`
	End   *time.Time `bson:"end,omitempty" json:"end,omitempty"`
}

// GeoJSON represents a GeoJSON geometry
type GeoJSON struct {
	Type        string      `bson:"type" json:"type" validate:"required,oneof=Point LineString Polygon MultiPoint MultiLineString MultiPolygon"`
	Coordinates interface{} `bson:"coordinates" json:"coordinates" validate:"required"`
}

// ObservationStats contains aggregated statistics
type ObservationStats struct {
	DatastreamID   string    `bson:"_id" json:"datastreamId"`
	Count          int64     `bson:"count" json:"count"`
	Average        float64   `bson:"average" json:"average"`
	Min            float64   `bson:"min" json:"min"`
	Max            float64   `bson:"max" json:"max"`
	StdDev         float64   `bson:"stdDev" json:"stdDev"`
	FirstObservation time.Time `bson:"firstObservation" json:"firstObservation"`
	LastObservation  time.Time `bson:"lastObservation" json:"lastObservation"`
}
