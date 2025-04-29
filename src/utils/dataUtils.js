/**
 * Utility functions for processing and manipulating data from global-data-on-sustainable-energy.json
 */

// Cache for loaded data to avoid repeated fetches
let globalDataCache = null;

/**
 * Load the global sustainable energy data
 * @returns {Promise<Array>} The loaded data
 */
async function loadGlobalData() {
  if (globalDataCache) {
    return globalDataCache;
  }
  
  try {
    const response = await fetch('../data/global-data-on-sustainable-energy.json');
    const data = await response.json();
    globalDataCache = data;
    return data;
  } catch (error) {
    console.error('Error loading global data:', error);
    throw error;
  }
}

/**
 * Get array of years available in the dataset
 * @returns {Promise<Array<number>>} Array of years
 */
export async function getYearsInData() {
  const data = await loadGlobalData();
  const years = new Set();
  
  data.forEach(entry => {
    if (entry.Year) {
      years.add(parseInt(entry.Year));
    }
  });
  
  return Array.from(years).sort();
}

/**
 * Get all countries available in the dataset
 * @returns {Promise<Array<string>>} Array of country names
 */
export async function getCountriesInData() {
  const data = await loadGlobalData();
  const countries = new Set();
  
  data.forEach(entry => {
    if (entry.Entity && typeof entry.Entity === 'string' && !entry.Entity.includes('World')) {
      countries.add(entry.Entity);
    }
  });
  
  return Array.from(countries).sort();
}

/**
 * Group countries by continent based on latitude and longitude
 * This is a simplified approach using geographic coordinates
 * @returns {Promise<Object>} Object with continents as keys and arrays of countries as values
 */
export async function getCountriesByRegion() {
  const data = await loadGlobalData();
  
  // Create a mapping of countries to their coordinates
  const countryCoordinates = {};
  
  data.forEach(entry => {
    if (entry.Entity && entry.Latitude && entry.Longitude) {
      countryCoordinates[entry.Entity] = {
        lat: parseFloat(entry.Latitude),
        lng: parseFloat(entry.Longitude)
      };
    }
  });
  
  // Simplified continent boundaries (rough approximation)
  const regions = {
    'North America': [],
    'South America': [],
    'Europe': [],
    'Africa': [],
    'Asia': [],
    'Oceania': []
  };
  
  // Assign countries to continents based on coordinates
  Object.entries(countryCoordinates).forEach(([country, coords]) => {
    const { lat, lng } = coords;
    
    // Skip if the country is "World" or similar
    if (country.includes('World') || country.includes('Income') || 
        country.includes('Union') || country.includes('Region')) {
      return;
    }
    
    // Very simple continent assignment based on lat/lng
    // This is a rough approximation and not geographically precise
    if (lng >= -170 && lng <= -30 && lat >= 15) {
      regions['North America'].push(country);
    } else if (lng >= -85 && lng <= -30 && lat < 15) {
      regions['South America'].push(country);
    } else if (lng >= -30 && lng <= 45 && lat >= 35) {
      regions['Europe'].push(country);
    } else if (lng >= -30 && lng <= 60 && lat < 35 && lat >= -40) {
      regions['Africa'].push(country);
    } else if (lng > 60 && lng <= 180 && lat >= -10) {
      regions['Asia'].push(country);
    } else if ((lng > 60 && lng <= 180) || (lng >= -180 && lng < -170)) {
      if (lat < -10) {
        regions['Oceania'].push(country);
      } else {
        regions['Asia'].push(country);
      }
    } else {
      // Default to Asia for any countries that don't fit the simple rules
      regions['Asia'].push(country);
    }
  });
  
  return regions;
}

/**
 * Get top countries by a specific metric for a given year
 * @param {string} metricKey The key of the metric to rank by
 * @param {number} year The year to filter by
 * @param {number} limit The number of countries to return
 * @param {boolean} descending Whether to sort in descending order
 * @returns {Promise<Array>} Array of country objects with country name and value
 */
export async function getTopCountriesByMetric(metricKey, year, limit = 10, descending = true) {
  const data = await loadGlobalData();
  
  // Filter data for the requested year
  const yearData = data.filter(entry => parseInt(entry.Year) === year);
  
  // Create country-to-value mapping
  const countryValues = [];
  yearData.forEach(entry => {
    if (entry.Entity && entry[metricKey] !== undefined && entry[metricKey] !== null) {
      // Skip if the country is "World" or similar
      if (entry.Entity.includes('World') || entry.Entity.includes('Income') || 
          entry.Entity.includes('Union') || entry.Entity.includes('Region')) {
        return;
      }
      
      countryValues.push({
        country: entry.Entity,
        value: parseFloat(entry[metricKey])
      });
    }
  });
  
  // Remove duplicate countries by keeping the latest entry
  const uniqueCountries = {};
  countryValues.forEach(item => {
    uniqueCountries[item.country] = item.value;
  });
  
  // Convert back to array
  const result = Object.entries(uniqueCountries).map(([country, value]) => ({
    country,
    value: isNaN(value) ? 0 : value
  }));
  
  // Sort by value
  if (descending) {
    result.sort((a, b) => b.value - a.value);
  } else {
    result.sort((a, b) => a.value - b.value);
  }
  
  // Limit the number of results
  return result.slice(0, limit);
}

/**
 * Get global average for a metric by year
 * @param {string} metricKey The key of the metric to calculate average for
 * @returns {Promise<Object>} Object with years as keys and average values
 */
export async function getGlobalAverageByYear(metricKey) {
  const data = await loadGlobalData();
  const yearlyValues = {};
  const yearCounts = {};
  
  // Sum values by year
  data.forEach(entry => {
    if (entry.Year && entry[metricKey] !== undefined && entry[metricKey] !== null) {
      const year = entry.Year;
      const value = parseFloat(entry[metricKey]);
      
      if (!isNaN(value)) {
        if (!yearlyValues[year]) {
          yearlyValues[year] = 0;
          yearCounts[year] = 0;
        }
        yearlyValues[year] += value;
        yearCounts[year]++;
      }
    }
  });
  
  // Calculate averages
  const averages = {};
  Object.keys(yearlyValues).forEach(year => {
    if (yearCounts[year] > 0) {
      averages[year] = yearlyValues[year] / yearCounts[year];
    }
  });
  
  return averages;
}

/**
 * Get regional average for a metric by year
 * @param {string} metricKey The key of the metric to calculate average for
 * @param {number} year The year to filter by
 * @param {Object} regionMapping Mapping of region names to arrays of country names
 * @returns {Promise<Object>} Object with regions as keys and average values
 */
export async function getRegionalAveragesByYear(metricKey, year, regionMapping) {
  const data = await loadGlobalData();
  
  // Filter data for the requested year
  const yearData = data.filter(entry => parseInt(entry.Year) === year);
  
  // Create country-to-value mapping
  const countryValues = {};
  yearData.forEach(entry => {
    if (entry.Entity && entry[metricKey] !== undefined && entry[metricKey] !== null) {
      countryValues[entry.Entity] = parseFloat(entry[metricKey]);
    }
  });
  
  // Calculate regional averages
  const regionalAverages = {};
  
  Object.entries(regionMapping).forEach(([region, countries]) => {
    const validValues = countries
      .map(country => countryValues[country])
      .filter(value => !isNaN(value));
    
    if (validValues.length > 0) {
      const sum = validValues.reduce((total, value) => total + value, 0);
      regionalAverages[region] = sum / validValues.length;
    } else {
      regionalAverages[region] = 0;
    }
  });
  
  return regionalAverages;
}

/**
 * Calculate change in metric for countries between two years
 * @param {string} metricKey The key of the metric to calculate change for
 * @param {number} startYear The starting year
 * @param {number} endYear The ending year
 * @param {Array} countries List of countries to calculate change for
 * @returns {Promise<Object>} Object with countries as keys and change values
 */
export async function getMetricChangeByCountry(metricKey, startYear, endYear, countries) {
  const data = await loadGlobalData();
  
  // Filter data for the start and end years
  const startYearData = data.filter(entry => parseInt(entry.Year) === startYear);
  const endYearData = data.filter(entry => parseInt(entry.Year) === endYear);
  
  // Create country-to-value mappings
  const startValues = {};
  const endValues = {};
  
  startYearData.forEach(entry => {
    if (entry.Entity && entry[metricKey] !== undefined) {
      startValues[entry.Entity] = parseFloat(entry[metricKey]);
    }
  });
  
  endYearData.forEach(entry => {
    if (entry.Entity && entry[metricKey] !== undefined) {
      endValues[entry.Entity] = parseFloat(entry[metricKey]);
    }
  });
  
  // Calculate changes
  const changes = {};
  
  countries.forEach(country => {
    if (startValues[country] !== undefined && endValues[country] !== undefined) {
      changes[country] = {
        startValue: startValues[country],
        endValue: endValues[country],
        absoluteChange: endValues[country] - startValues[country],
        percentageChange: ((endValues[country] - startValues[country]) / startValues[country]) * 100
      };
    }
  });
  
  return changes;
}

/**
 * Format a number according to the specified format
 * @param {number} value The number to format
 * @param {string} format The format to use ('percentage', 'largeNumber', 'currency')
 * @returns {string} The formatted number
 */
export function formatNumber(value, format) {
  if (value === undefined || value === null || isNaN(value)) {
    return 'N/A';
  }
  
  switch (format) {
    case 'percentage':
      return `${value.toFixed(1)}%`;
    case 'largeNumber':
      return value >= 1000000 
        ? `${(value / 1000000).toFixed(1)}M` 
        : value >= 1000 
          ? `${(value / 1000).toFixed(1)}K` 
          : value.toFixed(1);
    case 'currency':
      return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    default:
      return value.toString();
  }
}

/**
 * Export data to CSV format
 * @param {Array} data The data to export
 * @param {Array} headers The headers for the CSV
 * @param {string} filename The name of the file to save
 */
export function exportToCSV(data, headers, filename) {
  // Create CSV header row
  let csvContent = headers.join(',') + '\n';
  
  // Add data rows
  data.forEach(row => {
    const values = headers.map(header => {
      const value = row[header];
      // Handle values that contain commas
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value}"`;
      }
      return value;
    });
    csvContent += values.join(',') + '\n';
  });
  
  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
} 