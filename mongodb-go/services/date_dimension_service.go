package services

import (
	"context"
	"fmt"
	"time"

	"github.com/sirupsen/logrus"
	"go.mongodb.org/mongo-driver/mongo"
	"github.com/timoruohomaki/geospatial-data-as-data-lake/mongodb-go/models"
	"github.com/timoruohomaki/geospatial-data-as-data-lake/mongodb-go/repository"
)

// DateDimensionService handles date dimension operations
type DateDimensionService struct {
	db     *mongo.Database
	logger *logrus.Logger
}

// NewDateDimensionService creates a new date dimension service
func NewDateDimensionService(db *mongo.Database, logger *logrus.Logger) *DateDimensionService {
	return &DateDimensionService{
		db:     db,
		logger: logger,
	}
}

// GenerateDateRange generates date dimension records for a date range
func (s *DateDimensionService) GenerateDateRange(ctx context.Context, 
	startDate, endDate time.Time) ([]models.DateDimension, error) {
	
	// Define holidays (customize for your region)
	holidays := map[string]string{
		"01-01": "New Year's Day",
		"07-01": "Canada Day",
		"12-25": "Christmas Day",
		"12-26": "Boxing Day",
	}

	var dates []models.DateDimension
	current := startDate

	for !current.After(endDate) {
		date := s.generateDateRecord(current, holidays)
		dates = append(dates, date)
		current = current.AddDate(0, 0, 1)
	}

	s.logger.Infof("Generated %d date records", len(dates))
	return dates, nil
}

// generateDateRecord creates a single date dimension record
func (s *DateDimensionService) generateDateRecord(date time.Time, holidays map[string]string) models.DateDimension {
	year := date.Year()
	month := int(date.Month())
	day := date.Day()
	dayOfWeek := int(date.Weekday())

	// Calculate ISO week
	isoYear, isoWeek := models.CalculateISOWeek(date)
	
	// Calculate quarter
	quarter := (month-1)/3 + 1
	
	// Calculate fiscal periods (July 1 start)
	fiscalYear := models.GetFiscalYear(date)
	fiscalQuarter := models.GetFiscalQuarter(month)
	fiscalMonth := models.GetFiscalMonth(month)
	
	// Check for holidays
	monthDay := fmt.Sprintf("%02d-%02d", month, day)
	holidayName, isHoliday := holidays[monthDay]
	
	// Day names
	dayNames := []string{"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"}
	dayAbbrs := []string{"Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"}
	monthNames := []string{"", "January", "February", "March", "April", "May", "June",
		"July", "August", "September", "October", "November", "December"}
	monthAbbrs := []string{"", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
		"Jul", "Aug", "Sep", "Oct", "Nov", "Dec"}
	
	// Calculate days in month
	firstOfNextMonth := time.Date(year, time.Month(month+1), 1, 0, 0, 0, 0, time.UTC)
	daysInMonth := firstOfNextMonth.AddDate(0, 0, -1).Day()
	
	// Calculate relative dates
	today := time.Now().Truncate(24 * time.Hour)
	diffDays := int(date.Sub(today).Hours() / 24)
	
	// Business day calculation
	isWeekday := dayOfWeek != 0 && dayOfWeek != 6
	isBusinessDay := isWeekday && !isHoliday
	
	// Season calculation
	season := models.GetSeason(month)
	
	return models.DateDimension{
		ID:       models.GetDateKey(date),
		FullDate: date,
		
		// Standard temporal attributes
		Year:    year,
		Quarter: quarter,
		Month:   month,
		Week:    (day-1)/7 + 1,
		Day:     day,
		
		// Descriptive attributes
		MonthName: monthNames[month],
		MonthAbbr: monthAbbrs[month],
		DayName:   dayNames[dayOfWeek],
		DayAbbr:   dayAbbrs[dayOfWeek],
		
		// ISO week dates
		ISOWeek:      isoWeek,
		ISOYear:      isoYear,
		ISODayOfWeek: func() int { if dayOfWeek == 0 { return 7 }; return dayOfWeek }(),
		
		// Relative positioning
		DayOfWeek:    func() int { if dayOfWeek == 0 { return 7 }; return dayOfWeek }(),
		DayOfMonth:   day,
		DayOfQuarter: s.dayOfQuarter(date, quarter),
		DayOfYear:    date.YearDay(),
		WeekOfMonth:  (day-1)/7 + 1,
		WeekOfYear:   (date.YearDay()-1)/7 + 1,
		
		// Business calendar
		IsWeekday:     isWeekday,
		IsWeekend:     !isWeekday,
		IsHoliday:     isHoliday,
		HolidayName:   holidayName,
		IsBusinessDay: isBusinessDay,
		FiscalYear:    fiscalYear,
		FiscalQuarter: fiscalQuarter,
		FiscalMonth:   fiscalMonth,
		
		// Additional attributes
		DaysInMonth:      daysInMonth,
		IsLeapYear:       year%4 == 0 && (year%100 != 0 || year%400 == 0),
		IsLastDayOfMonth: day == daysInMonth,
		Season:           season,
		
		// Relative offsets
		DaysFromToday:     diffDays,
		WeeksFromToday:    diffDays / 7,
		MonthsFromToday:   diffDays / 30,
		QuartersFromToday: diffDays / 90,
	}
}

// dayOfQuarter calculates the day within the quarter
func (s *DateDimensionService) dayOfQuarter(date time.Time, quarter int) int {
	year := date.Year()
	firstMonth := (quarter-1)*3 + 1
	quarterStart := time.Date(year, time.Month(firstMonth), 1, 0, 0, 0, 0, time.UTC)
	return int(date.Sub(quarterStart).Hours()/24) + 1
}

// InsertDateDimension inserts date dimension records into the database
func (s *DateDimensionService) InsertDateDimension(ctx context.Context, dates []models.DateDimension) error {
	collection := s.db.Collection("date_dimension")
	
	// Convert to interface slice for insertion
	docs := make([]interface{}, len(dates))
	for i, date := range dates {
		docs[i] = date
	}
	
	// Insert in batches
	batchSize := 1000
	for i := 0; i < len(docs); i += batchSize {
		end := i + batchSize
		if end > len(docs) {
			end = len(docs)
		}
		
		batch := docs[i:end]
		if _, err := collection.InsertMany(ctx, batch); err != nil {
			return fmt.Errorf("failed to insert batch: %w", err)
		}
		
		s.logger.Infof("Inserted batch %d-%d of %d", i, end, len(docs))
	}
	
	return nil
}

// GetDateDimension retrieves a date dimension record
func (s *DateDimensionService) GetDateDimension(ctx context.Context, dateKey int) (*models.DateDimension, error) {
	collection := s.db.Collection("date_dimension")
	
	var date models.DateDimension
	err := collection.FindOne(ctx, map[string]int{"_id": dateKey}).Decode(&date)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, fmt.Errorf("date dimension not found for key %d", dateKey)
		}
		return nil, fmt.Errorf("failed to get date dimension: %w", err)
	}
	
	return &date, nil
}
