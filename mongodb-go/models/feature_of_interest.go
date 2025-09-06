package models

import (
	"time"
)

// FeatureOfInterest represents a geographic feature
type FeatureOfInterest struct {
	ID               string                  `bson:"_id" json:"id" validate:"required"`
	Name             string                  `bson:"name" json:"name" validate:"required"`
	Description      string                  `bson:"description,omitempty" json:"description,omitempty"`
	EncodingType     string                  `bson:"encodingType" json:"encodingType" validate:"required,oneof=application/vnd.geo+json application/gml+xml"`
	Feature          GeoJSONFeature          `bson:"feature" json:"feature" validate:"required"`
	ExternalFeatures []ExternalFeature       `bson:"externalFeatures,omitempty" json:"externalFeatures,omitempty"`
	Hierarchy        *FeatureHierarchy       `bson:"hierarchy,omitempty" json:"hierarchy,omitempty"`
	ObservationContext *ObservationContext   `bson:"observationContext,omitempty" json:"observationContext,omitempty"`
	Statistics       *FeatureStatistics      `bson:"statistics,omitempty" json:"statistics,omitempty"`
	Quality          *QualityMetadata        `bson:"quality,omitempty" json:"quality,omitempty"`
	Tags             []string                `bson:"tags,omitempty" json:"tags,omitempty"`
	CreatedAt        time.Time               `bson:"created_at" json:"createdAt"`
	UpdatedAt        time.Time               `bson:"updated_at" json:"updatedAt"`
}

// GeoJSONFeature represents a GeoJSON feature
type GeoJSONFeature struct {
	Type       string                 `bson:"type" json:"type" validate:"required,eq=Feature"`
	Geometry   *GeoJSON               `bson:"geometry,omitempty" json:"geometry,omitempty"`
	Properties map[string]interface{} `bson:"properties,omitempty" json:"properties,omitempty"`
}

// ExternalFeature represents a link to an external OGC API feature
type ExternalFeature struct {
	FeatureID       string            `bson:"featureId" json:"featureId"`
	FeatureAPI      ExternalAPIConfig `bson:"featureAPI" json:"featureAPI"`
	Association     Association       `bson:"association" json:"association"`
	CachedMetadata  *CachedMetadata   `bson:"cachedMetadata,omitempty" json:"cachedMetadata,omitempty"`
}

// ExternalAPIConfig contains API endpoint information
type ExternalAPIConfig struct {
	BaseURL    string   `bson:"baseUrl" json:"baseUrl"`
	Collection string   `bson:"collection" json:"collection"`
	ItemID     string   `bson:"itemId" json:"itemId"`
	Href       string   `bson:"href" json:"href"`
	Formats    []string `bson:"formats,omitempty" json:"formats,omitempty"`
}

// Association describes the relationship between features
type Association struct {
	Type         string     `bson:"type" json:"type" validate:"required,oneof=within contains intersects touches overlaps part_of"`
	Role         string     `bson:"role,omitempty" json:"role,omitempty"`
	Confidence   float64    `bson:"confidence,omitempty" json:"confidence,omitempty" validate:"min=0,max=1"`
	EstablishedAt time.Time `bson:"establishedAt" json:"establishedAt"`
	EstablishedBy string    `bson:"establishedBy" json:"establishedBy"`
	ValidFrom    time.Time  `bson:"validFrom" json:"validFrom"`
	ValidTo      *time.Time `bson:"validTo,omitempty" json:"validTo,omitempty"`
}

// CachedMetadata contains cached external feature data
type CachedMetadata struct {
	LastFetched     time.Time              `bson:"lastFetched" json:"lastFetched"`
	Properties      map[string]interface{} `bson:"properties,omitempty" json:"properties,omitempty"`
	BBox            []float64              `bson:"bbox,omitempty" json:"bbox,omitempty"`
	UpdateFrequency string                 `bson:"updateFrequency,omitempty" json:"updateFrequency,omitempty"`
}

// FeatureHierarchy represents hierarchical relationships
type FeatureHierarchy struct {
	Parents           []HierarchyNode    `bson:"parents,omitempty" json:"parents,omitempty"`
	Children          []HierarchyNode    `bson:"children,omitempty" json:"children,omitempty"`
	SemanticRelations []SemanticRelation `bson:"semanticRelations,omitempty" json:"semanticRelations,omitempty"`
}

// HierarchyNode represents a node in the hierarchy
type HierarchyNode struct {
	Level string `bson:"level" json:"level"`
	FoiID string `bson:"foiId" json:"foiId"`
	Name  string `bson:"name" json:"name"`
}

// SemanticRelation represents a semantic relationship
type SemanticRelation struct {
	Predicate string `bson:"predicate" json:"predicate"`
	URI       string `bson:"uri" json:"uri"`
	Source    string `bson:"source" json:"source"`
}

// ObservationContext provides context for observations
type ObservationContext struct {
	PrimaryPurpose      string   `bson:"primaryPurpose,omitempty" json:"primaryPurpose,omitempty"`
	RelevantProperties  []string `bson:"relevantProperties,omitempty" json:"relevantProperties,omitempty"`
	AggregationLevel    string   `bson:"aggregationLevel,omitempty" json:"aggregationLevel,omitempty"`
	RepresentativePoint *Point3D `bson:"representativePoint,omitempty" json:"representativePoint,omitempty"`
}

// Point3D represents a 3D point
type Point3D struct {
	Type        string    `bson:"type" json:"type" validate:"required,eq=Point"`
	Coordinates []float64 `bson:"coordinates" json:"coordinates" validate:"required,len=2|len=3"`
	Elevation   float64   `bson:"elevation,omitempty" json:"elevation,omitempty"`
}

// FeatureStatistics contains usage statistics
type FeatureStatistics struct {
	ObservationCount      int64     `bson:"observationCount" json:"observationCount"`
	FirstObservation      time.Time `bson:"firstObservation" json:"firstObservation"`
	LastObservation       time.Time `bson:"lastObservation" json:"lastObservation"`
	AverageObservationsPerDay float64 `bson:"averageObservationsPerDay" json:"averageObservationsPerDay"`
	AssociatedDatastreams int      `bson:"associatedDatastreams" json:"associatedDatastreams"`
}

// QualityMetadata contains quality information
type QualityMetadata struct {
	GeometrySource   string    `bson:"geometrySource,omitempty" json:"geometrySource,omitempty"`
	GeometryAccuracy float64   `bson:"geometryAccuracy,omitempty" json:"geometryAccuracy,omitempty"`
	LastValidated    time.Time `bson:"lastValidated,omitempty" json:"lastValidated,omitempty"`
}
