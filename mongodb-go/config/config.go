package config

import (
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
	"github.com/sirupsen/logrus"
)

// Config holds all configuration for the application
type Config struct {
	MongoDB    MongoDBConfig
	APIs       APIConfig
	Sync       SyncConfig
	App        AppConfig
	Retention  RetentionConfig
	Monitoring MonitoringConfig
}

// MongoDBConfig contains MongoDB connection settings
type MongoDBConfig struct {
	URI                   string
	DatabaseName          string
	MaxPoolSize           uint64
	MinPoolSize           uint64
	ConnectionTimeout     time.Duration
	MaxIdleTime           time.Duration
	RetryWrites           bool
	WriteConcern          string
}

// APIConfig contains external API configurations
type APIConfig struct {
	OGCAPIBaseURL string
	FintoAPIURL   string
	APIKey        string
}

// SyncConfig contains synchronization settings
type SyncConfig struct {
	SyncInterval         time.Duration
	CacheTTL             time.Duration
	FeatureSyncEnabled   bool
	FeatureSyncBatchSize int
	FeatureSyncRetries   int
	UCUMSyncEnabled      bool
	UCUMSyncSchedule     string
}

// AppConfig contains application settings
type AppConfig struct {
	Environment string
	Port        int
	LogLevel    string
	LogFormat   string
	JWTSecret   string
}

// RetentionConfig contains data retention policies
type RetentionConfig struct {
	ObservationDays int
	CacheDays       int
}

// MonitoringConfig contains monitoring settings
type MonitoringConfig struct {
	Enabled     bool
	Endpoint    string
	APIKey      string
}

// Load reads configuration from environment variables
func Load() (*Config, error) {
	// Load .env file if it exists
	if err := godotenv.Load(); err != nil {
		logrus.Debug(".env file not found, using environment variables")
	}

	cfg := &Config{}

	// MongoDB configuration
	cfg.MongoDB.URI = getEnv("MONGODB_URI", "mongodb://localhost:27017")
	cfg.MongoDB.DatabaseName = getEnv("DATABASE_NAME", "sensorthings_datalake")
	cfg.MongoDB.MaxPoolSize = getEnvAsUint64("MAX_POOL_SIZE", 10)
	cfg.MongoDB.MinPoolSize = getEnvAsUint64("MIN_POOL_SIZE", 5)
	cfg.MongoDB.ConnectionTimeout = time.Duration(getEnvAsInt("CONNECTION_TIMEOUT_SECONDS", 10)) * time.Second
	cfg.MongoDB.MaxIdleTime = time.Duration(getEnvAsInt("MAX_IDLE_TIME_MINUTES", 10)) * time.Minute
	cfg.MongoDB.RetryWrites = true
	cfg.MongoDB.WriteConcern = "majority"

	// API configuration
	cfg.APIs.OGCAPIBaseURL = getEnv("OGCAPI_BASE_URL", "")
	cfg.APIs.FintoAPIURL = getEnv("FINTO_API_URL", "https://api.finto.fi")
	cfg.APIs.APIKey = getEnv("API_KEY", "")

	// Sync configuration
	cfg.Sync.SyncInterval = time.Duration(getEnvAsInt("SYNC_INTERVAL_MINUTES", 60)) * time.Minute
	cfg.Sync.CacheTTL = time.Duration(getEnvAsInt("CACHE_TTL_DAYS", 30)) * 24 * time.Hour
	cfg.Sync.FeatureSyncEnabled = getEnvAsBool("FEATURE_SYNC_ENABLED", true)
	cfg.Sync.FeatureSyncBatchSize = getEnvAsInt("FEATURE_SYNC_BATCH_SIZE", 100)
	cfg.Sync.FeatureSyncRetries = getEnvAsInt("FEATURE_SYNC_RETRY_ATTEMPTS", 3)
	cfg.Sync.UCUMSyncEnabled = getEnvAsBool("UCUM_SYNC_ENABLED", true)
	cfg.Sync.UCUMSyncSchedule = getEnv("UCUM_SYNC_SCHEDULE", "0 0 1 * *")

	// App configuration
	cfg.App.Environment = getEnv("APP_ENV", "development")
	cfg.App.Port = getEnvAsInt("APP_PORT", 8080)
	cfg.App.LogLevel = getEnv("LOG_LEVEL", "info")
	cfg.App.LogFormat = getEnv("LOG_FORMAT", "json")
	cfg.App.JWTSecret = getEnv("JWT_SECRET", "")

	// Retention configuration
	cfg.Retention.ObservationDays = getEnvAsInt("OBSERVATION_RETENTION_DAYS", 365)
	cfg.Retention.CacheDays = getEnvAsInt("CACHE_RETENTION_DAYS", 30)

	// Monitoring configuration
	cfg.Monitoring.Enabled = getEnvAsBool("MONITORING_ENABLED", false)
	cfg.Monitoring.Endpoint = getEnv("MONITORING_ENDPOINT", "")
	cfg.Monitoring.APIKey = getEnv("MONITORING_API_KEY", "")

	// Validate configuration
	if err := cfg.Validate(); err != nil {
		return nil, fmt.Errorf("configuration validation failed: %w", err)
	}

	return cfg, nil
}

// Validate checks if the configuration is valid
func (c *Config) Validate() error {
	if c.MongoDB.URI == "" {
		return fmt.Errorf("MONGODB_URI is required")
	}
	if c.MongoDB.DatabaseName == "" {
		return fmt.Errorf("DATABASE_NAME is required")
	}
	if c.App.Environment == "production" && c.App.JWTSecret == "" {
		return fmt.Errorf("JWT_SECRET is required in production")
	}
	return nil
}

// Helper functions
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	strValue := getEnv(key, "")
	if strValue == "" {
		return defaultValue
	}
	if value, err := strconv.Atoi(strValue); err == nil {
		return value
	}
	return defaultValue
}

func getEnvAsUint64(key string, defaultValue uint64) uint64 {
	strValue := getEnv(key, "")
	if strValue == "" {
		return defaultValue
	}
	if value, err := strconv.ParseUint(strValue, 10, 64); err == nil {
		return value
	}
	return defaultValue
}

func getEnvAsBool(key string, defaultValue bool) bool {
	strValue := getEnv(key, "")
	if strValue == "" {
		return defaultValue
	}
	if value, err := strconv.ParseBool(strValue); err == nil {
		return value
	}
	return defaultValue
}
