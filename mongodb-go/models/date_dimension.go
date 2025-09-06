package models

import (
	"time"
)

// DateDimension represents a date in the date dimension table
type DateDimension struct {
	ID       int       `bson:"_id" json:"id"` // YYYYMMDD format
	FullDate time.Time `bson:"full_date" json:"fullDate"`
	
	// Standard temporal attributes
	Year    int `bson:"year" json:"year"`
	Quarter int `bson:"quarter" json:"quarter"`
	Month   int `bson:"month" json:"month"`
	Week    int `bson:"week" json:"week"`
	Day     int `bson:"day" json:"day"`
	
	// Descriptive attributes
	MonthName string `bson:"month_name" json:"monthName"`
	MonthAbbr string `bson:"month_abbr" json:"monthAbbr"`
	DayName   string `bson:"day_name" json:"dayName"`
	DayAbbr   string `bson:"day_abbr" json:"dayAbbr"`
	
	// ISO week dates
	ISOWeek      int `bson:"iso_week" json:"isoWeek"`
	ISOYear      int `bson:"iso_year" json:"isoYear"`
	ISODayOfWeek int `bson:"iso_day_of_week" json:"isoDayOfWeek"`
	
	// Relative positioning
	DayOfWeek    int `bson:"day_of_week" json:"dayOfWeek"`
	DayOfMonth   int `bson:"day_of_month" json:"dayOfMonth"`
	DayOfQuarter int `bson:"day_of_quarter" json:"dayOfQuarter"`
	DayOfYear    int `bson:"day_of_year" json:"dayOfYear"`
	WeekOfMonth  int `bson:"week_of_month" json:"weekOfMonth"`
	WeekOfYear   int `bson:"week_of_year" json:"weekOfYear"`
	
	// Business calendar
	IsWeekday       bool   `bson:"is_weekday" json:"isWeekday"`
	IsWeekend       bool   `bson:"is_weekend" json:"isWeekend"`
	IsHoliday       bool   `bson:"is_holiday" json:"isHoliday"`
	HolidayName     string `bson:"holiday_name,omitempty" json:"holidayName,omitempty"`
	IsBusinessDay   bool   `bson:"is_business_day" json:"isBusinessDay"`
	FiscalYear      int    `bson:"fiscal_year" json:"fiscalYear"`
	FiscalQuarter   int    `bson:"fiscal_quarter" json:"fiscalQuarter"`
	FiscalMonth     int    `bson:"fiscal_month" json:"fiscalMonth"`
	
	// Additional attributes
	DaysInMonth        int    `bson:"days_in_month" json:"daysInMonth"`
	IsLeapYear         bool   `bson:"is_leap_year" json:"isLeapYear"`
	IsLastDayOfMonth   bool   `bson:"is_last_day_of_month" json:"isLastDayOfMonth"`
	Season             string `bson:"season" json:"season"`
	
	// Relative offsets from today
	DaysFromToday     int `bson:"days_from_today" json:"daysFromToday"`
	WeeksFromToday    int `bson:"weeks_from_today" json:"weeksFromToday"`
	MonthsFromToday   int `bson:"months_from_today" json:"monthsFromToday"`
	QuartersFromToday int `bson:"quarters_from_today" json:"quartersFromToday"`
}

// HolidayDefinition defines a holiday
type HolidayDefinition struct {
	MonthDay string `json:"monthDay"` // Format: "MM-DD"
	Name     string `json:"name"`
}

// GetDateKey returns the date key in YYYYMMDD format
func GetDateKey(t time.Time) int {
	year := t.Year()
	month := int(t.Month())
	day := t.Day()
	return year*10000 + month*100 + day
}

// GetHourBucket returns the hour bucket (0-23) for a time
func GetHourBucket(t time.Time) int {
	return t.Hour()
}

// CalculateISOWeek calculates the ISO week number
func CalculateISOWeek(date time.Time) (year, week int) {
	year, week = date.ISOWeek()
	return
}

// GetSeason returns the season for a given month (Northern Hemisphere)
func GetSeason(month int) string {
	switch {
	case month >= 3 && month <= 5:
		return "Spring"
	case month >= 6 && month <= 8:
		return "Summer"
	case month >= 9 && month <= 11:
		return "Autumn"
	default:
		return "Winter"
	}
}

// IsBusinessDay determines if a date is a business day
func IsBusinessDay(date time.Time, holidays map[string]bool) bool {
	// Check if weekend
	dayOfWeek := date.Weekday()
	if dayOfWeek == time.Saturday || dayOfWeek == time.Sunday {
		return false
	}
	
	// Check if holiday
	monthDay := date.Format("01-02")
	if holidays[monthDay] {
		return false
	}
	
	return true
}

// GetFiscalYear calculates fiscal year (July 1 start)
func GetFiscalYear(date time.Time) int {
	year := date.Year()
	month := int(date.Month())
	if month >= 7 {
		return year + 1
	}
	return year
}

// GetFiscalQuarter calculates fiscal quarter (July 1 start)
func GetFiscalQuarter(month int) int {
	if month >= 7 {
		return (month - 7) / 3 + 1
	}
	return (month + 5) / 3 + 1
}

// GetFiscalMonth calculates fiscal month (July 1 start)
func GetFiscalMonth(month int) int {
	if month >= 7 {
		return month - 6
	}
	return month + 6
}
