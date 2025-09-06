package models

import (
	"time"
)

// UnitOfMeasurement represents a UCUM unit with ontology support
type UnitOfMeasurement struct {
	URI                    string              `bson:"uri" json:"uri" validate:"required"`
	UCUMCode               string              `bson:"ucumCode" json:"ucumCode" validate:"required"`
	UCUMCodeCaseSensitive  string              `bson:"ucumCodeCaseSensitive,omitempty" json:"ucumCodeCaseSensitive,omitempty"`
	Labels                 UnitLabels          `bson:"labels" json:"labels"`
	Definition             map[string]string   `bson:"definition,omitempty" json:"definition,omitempty"`
	Hierarchy              *UnitHierarchy      `bson:"hierarchy,omitempty" json:"hierarchy,omitempty"`
	Conversion             *UnitConversion     `bson:"conversion,omitempty" json:"conversion,omitempty"`
	Classification         *UnitClassification `bson:"classification,omitempty" json:"classification,omitempty"`
	ISO80000               *ISO80000Info       `bson:"iso80000,omitempty" json:"iso80000,omitempty"`
	Metadata               *UnitMetadata       `bson:"metadata,omitempty" json:"metadata,omitempty"`
	SensorThingsUsage      *UsageStatistics    `bson:"sensorThings,omitempty" json:"sensorThings,omitempty"`
}

// UnitLabels contains multilingual labels
type UnitLabels struct {
	Preferred   map[string]string `bson:"preferred" json:"preferred"`
	Alternative []AlternativeLabel `bson:"alternative,omitempty" json:"alternative,omitempty"`
}

// AlternativeLabel represents an alternative label
type AlternativeLabel struct {
	Lang  string `bson:"lang" json:"lang"`
	Value string `bson:"value" json:"value"`
}

// UnitHierarchy represents hierarchical relationships
type UnitHierarchy struct {
	Broader           []UnitReference `bson:"broader,omitempty" json:"broader,omitempty"`
	Narrower          []UnitReference `bson:"narrower,omitempty" json:"narrower,omitempty"`
	BroaderTransitive []string        `bson:"broaderTransitive,omitempty" json:"broaderTransitive,omitempty"`
	NarrowerTransitive []string       `bson:"narrowerTransitive,omitempty" json:"narrowerTransitive,omitempty"`
}

// UnitReference represents a reference to another unit
type UnitReference struct {
	URI      string `bson:"uri" json:"uri"`
	UCUMCode string `bson:"ucumCode" json:"ucumCode"`
	Label    string `bson:"label" json:"label"`
	Level    int    `bson:"level" json:"level"`
}

// UnitConversion contains conversion information
type UnitConversion struct {
	ToBaseUnit BaseUnitConversion `bson:"toBaseUnit,omitempty" json:"toBaseUnit,omitempty"`
	Formula    string            `bson:"formula,omitempty" json:"formula,omitempty"`
	IsMetric   bool              `bson:"isMetric" json:"isMetric"`
}

// BaseUnitConversion defines conversion to base unit
type BaseUnitConversion struct {
	Factor       float64 `bson:"factor" json:"factor"`
	BaseUnitURI  string  `bson:"baseUnitUri" json:"baseUnitUri"`
	BaseUnitCode string  `bson:"baseUnitCode" json:"baseUnitCode"`
	Operation    string  `bson:"operation" json:"operation" validate:"oneof=multiply divide add subtract"`
}

// UnitClassification contains classification information
type UnitClassification struct {
	Dimension    string   `bson:"dimension,omitempty" json:"dimension,omitempty"`
	QuantityKind string   `bson:"quantityKind,omitempty" json:"quantityKind,omitempty"`
	System       string   `bson:"system,omitempty" json:"system,omitempty" validate:"omitempty,oneof=SI SI-derived imperial US-customary other"`
	Categories   []string `bson:"categories,omitempty" json:"categories,omitempty"`
	IsBaseUnit   bool     `bson:"isBaseUnit" json:"isBaseUnit"`
	IsArbitrary  bool     `bson:"isArbitrary" json:"isArbitrary"`
}

// ISO80000Info contains ISO 80000 compliance information
type ISO80000Info struct {
	Compliant          bool     `bson:"compliant" json:"compliant"`
	Part               string   `bson:"part,omitempty" json:"part,omitempty"`
	Section            string   `bson:"section,omitempty" json:"section,omitempty"`
	Status             string   `bson:"status,omitempty" json:"status,omitempty" validate:"omitempty,oneof=accepted deprecated obsolete"`
	AlternativeSymbols []string `bson:"alternativeSymbols,omitempty" json:"alternativeSymbols,omitempty"`
}

// UnitMetadata contains cache and sync metadata
type UnitMetadata struct {
	FintoLastFetched time.Time `bson:"fintoLastFetched,omitempty" json:"fintoLastFetched,omitempty"`
	FintoVersion     string    `bson:"fintoVersion,omitempty" json:"fintoVersion,omitempty"`
	CacheExpiry      time.Time `bson:"cacheExpiry,omitempty" json:"cacheExpiry,omitempty"`
	SyncStatus       string    `bson:"syncStatus,omitempty" json:"syncStatus,omitempty" validate:"omitempty,oneof=current stale error"`
	LastModified     time.Time `bson:"lastModified,omitempty" json:"lastModified,omitempty"`
}

// UsageStatistics tracks usage within SensorThings
type UsageStatistics struct {
	ObservationCount int64     `bson:"observationCount" json:"observationCount"`
	DatastreamCount  int       `bson:"datastreamCount" json:"datastreamCount"`
	LastUsed         time.Time `bson:"lastUsed,omitempty" json:"lastUsed,omitempty"`
	FrequencyScore   float64   `bson:"frequencyScore,omitempty" json:"frequencyScore,omitempty" validate:"min=0,max=1"`
}
