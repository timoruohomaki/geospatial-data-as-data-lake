/**
 * Date Dimension Generator
 * 
 * Generates date dimension data for the specified date range.
 * The date dimension is crucial for time-based analytics and reporting.
 * 
 * Usage: node date-dimension-generator.js
 */

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '../.env' });

// Configuration
const CONFIG = {
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
  database: process.env.DATABASE_NAME || 'sensorthings_datalake',
  collection: 'date_dimension',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2026-12-31'),
  locale: 'en-US'
};

// Holiday definitions (customize for your region)
const HOLIDAYS = {
  '01-01': 'New Year\'s Day',
  '07-01': 'Canada Day',
  '12-25': 'Christmas Day',
  '12-26': 'Boxing Day'
};

/**
 * Generate a single date dimension record
 */
function generateDateRecord(date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = date.getDay();
  
  // Calculate ISO week
  const thursday = new Date(date);
  thursday.setDate(thursday.getDate() + (4 - (dayOfWeek || 7)));
  const yearStart = new Date(thursday.getFullYear(), 0, 1);
  const isoWeek = Math.ceil(((thursday - yearStart) / 86400000 + 1) / 7);
  
  // Calculate quarter
  const quarter = Math.ceil(month / 3);
  
  // Calculate fiscal year (assuming July 1 start)
  const fiscalYear = month >= 7 ? year + 1 : year;
  const fiscalQuarter = month >= 7 ? 
    Math.ceil((month - 6) / 3) : 
    Math.ceil((month + 6) / 3);
  const fiscalMonth = month >= 7 ? month - 6 : month + 6;
  
  // Check for holidays
  const monthDay = `${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  const isHoliday = HOLIDAYS.hasOwnProperty(monthDay);
  const holidayName = HOLIDAYS[monthDay] || null;
  
  // Day names
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayAbbrs = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const monthAbbrs = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Calculate days in month
  const daysInMonth = new Date(year, month, 0).getDate();
  
  // Calculate if it's the last day of month
  const isLastDayOfMonth = day === daysInMonth;
  
  // Determine season (Northern Hemisphere)
  let season;
  if (month >= 3 && month <= 5) season = 'Spring';
  else if (month >= 6 && month <= 8) season = 'Summer';
  else if (month >= 9 && month <= 11) season = 'Autumn';
  else season = 'Winter';
  
  // Calculate relative dates
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = date - today;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return {
    _id: parseInt(`${year}${month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}`),
    full_date: date,
    
    // Standard temporal attributes
    year: year,
    quarter: quarter,
    month: month,
    week: Math.ceil(day / 7),
    day: day,
    
    // Descriptive attributes
    month_name: monthNames[month - 1],
    month_abbr: monthAbbrs[month - 1],
    day_name: dayNames[dayOfWeek],
    day_abbr: dayAbbrs[dayOfWeek],
    
    // ISO week dates
    iso_week: isoWeek,
    iso_year: thursday.getFullYear(),
    iso_day_of_week: dayOfWeek === 0 ? 7 : dayOfWeek,
    
    // Relative positioning
    day_of_week: dayOfWeek === 0 ? 7 : dayOfWeek,
    day_of_month: day,
    day_of_quarter: Math.floor((date - new Date(year, (quarter - 1) * 3, 1)) / 86400000) + 1,
    day_of_year: Math.floor((date - new Date(year, 0, 1)) / 86400000) + 1,
    week_of_month: Math.ceil(day / 7),
    week_of_year: Math.ceil(((date - new Date(year, 0, 1)) / 86400000 + 1) / 7),
    
    // Business calendar
    is_weekday: dayOfWeek !== 0 && dayOfWeek !== 6,
    is_weekend: dayOfWeek === 0 || dayOfWeek === 6,
    is_holiday: isHoliday,
    holiday_name: holidayName,
    is_business_day: dayOfWeek !== 0 && dayOfWeek !== 6 && !isHoliday,
    fiscal_year: fiscalYear,
    fiscal_quarter: fiscalQuarter,
    fiscal_month: fiscalMonth,
    
    // Additional attributes
    days_in_month: daysInMonth,
    is_leap_year: (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0),
    is_last_day_of_month: isLastDayOfMonth,
    season: season,
    
    // Relative offsets
    days_from_today: diffDays,
    weeks_from_today: Math.floor(diffDays / 7),
    months_from_today: Math.floor(diffDays / 30),
    quarters_from_today: Math.floor(diffDays / 90)
  };
}

/**
 * Generate all dates in the range
 */
function generateDateRange(startDate, endDate) {
  const dates = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    dates.push(generateDateRecord(new Date(currentDate)));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dates;
}

/**
 * Main execution
 */
async function main() {
  console.log('📅 Date Dimension Generator');
  console.log('='.repeat(50));
  
  const client = new MongoClient(CONFIG.mongoUri);
  
  try {
    // Connect to MongoDB
    console.log('\n🔗 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected successfully');
    
    const db = client.db(CONFIG.database);
    const collection = db.collection(CONFIG.collection);
    
    // Check existing data
    const existingCount = await collection.countDocuments();
    if (existingCount > 0) {
      console.log(`\n⚠️  Collection already contains ${existingCount} records`);
      console.log('   Do you want to replace them? (This will delete existing data)');
      
      // In a real scenario, you'd wait for user input
      // For now, we'll skip if data exists
      console.log('   Skipping generation to preserve existing data.');
      console.log('   To regenerate, manually drop the collection first.');
      return;
    }
    
    // Generate date records
    console.log(`\n📊 Generating dates from ${CONFIG.startDate.toISOString().split('T')[0]} to ${CONFIG.endDate.toISOString().split('T')[0]}`);
    const dates = generateDateRange(CONFIG.startDate, CONFIG.endDate);
    console.log(`   Generated ${dates.length} date records`);
    
    // Insert in batches
    console.log('\n💾 Inserting into MongoDB...');
    const batchSize = 1000;
    let inserted = 0;
    
    for (let i = 0; i < dates.length; i += batchSize) {
      const batch = dates.slice(i, i + batchSize);
      await collection.insertMany(batch, { ordered: false });
      inserted += batch.length;
      
      // Progress indicator
      const progress = Math.round((inserted / dates.length) * 100);
      process.stdout.write(`\r   Progress: ${progress}% (${inserted}/${dates.length})`);
    }
    
    console.log('\n✅ Date dimension created successfully!');
    
    // Create indexes
    console.log('\n🔍 Creating indexes...');
    await collection.createIndex({ year: 1, month: 1, day: 1 });
    await collection.createIndex({ iso_week: 1, iso_year: 1 });
    await collection.createIndex({ fiscal_year: 1, fiscal_quarter: 1 });
    await collection.createIndex({ is_business_day: 1 });
    await collection.createIndex({ is_holiday: 1 });
    console.log('✅ Indexes created');
    
    // Show statistics
    console.log('\n📈 Statistics:');
    const stats = await collection.aggregate([
      {
        $group: {
          _id: null,
          totalDays: { $sum: 1 },
          businessDays: { $sum: { $cond: ['$is_business_day', 1, 0] } },
          weekends: { $sum: { $cond: ['$is_weekend', 1, 0] } },
          holidays: { $sum: { $cond: ['$is_holiday', 1, 0] } }
        }
      }
    ]).toArray();
    
    if (stats.length > 0) {
      const stat = stats[0];
      console.log(`   Total Days: ${stat.totalDays}`);
      console.log(`   Business Days: ${stat.businessDays}`);
      console.log(`   Weekends: ${stat.weekends}`);
      console.log(`   Holidays: ${stat.holidays}`);
    }
    
    // Sample records
    console.log('\n📋 Sample Records:');
    const samples = await collection.find().limit(3).toArray();
    samples.forEach(sample => {
      console.log(`   ${sample.full_date.toISOString().split('T')[0]}: ${sample.day_name}, ${sample.month_name} ${sample.day}, ${sample.year}`);
      console.log(`     Week ${sample.iso_week}, Q${sample.quarter}, FY${sample.fiscal_year}`);
    });
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { generateDateRecord, generateDateRange };
