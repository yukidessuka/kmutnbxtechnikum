import { getYearsInData, getTopCountriesByMetric, getGlobalAverageByYear, getRegionalAveragesByYear, getMetricChangeByCountry, getCountriesByRegion, formatNumber, exportToCSV } from '../utils/dataUtils.js';

// Define our data metrics - these are the statistics we will show
const metrics = {
  renewable: {
    key: 'Renewable energy share in the total final energy consumption (%)',
    label: 'Renewable Energy (%)',
    format: 'percentage',
    color: '#48bb78'  // Green color
  },
  electricity: {
    key: 'Access to electricity (% of population)',
    label: 'Access to Electricity (%)',
    format: 'percentage',
    color: '#4299e1'  // Blue color
  },
  co2: {
    key: 'Value_co2_emissions_kt_by_country',
    label: 'CO2 Emissions (kt)',
    format: 'largeNumber',
    color: '#f56565'  // Red color
  },
  gdp: {
    key: 'gdp_per_capita',
    label: 'GDP per Capita',
    format: 'currency',
    color: '#f6ad55'  // Orange color
  }
};

// This will store all world regions - we'll fill it with data later
let regions = {};

// Variables to store our chart objects
let mainChart = null;
let trendsChart = null;
let regionsChart = null;

// Variables to keep track of what the user has selected
let currentYear = 2020;
let currentMetric = 'renewable';
let currentView = 'top10';
let chartData = [];
// Store the first year in the dataset for calculating changes over time
let baselineYear = 2000;

// This runs when the page loads
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Step 1: Load the regions data
    regions = await getCountriesByRegion();
    
    // Step 2: Set up the year selector dropdown
    await setupYearSelector();
    
    // Step 3: Set up event listeners for all controls
    setupEventListeners();
    
    // Step 4: Create the empty charts
    createEmptyCharts();
    
    // Step 5: Fill the charts with data
    updateAllCharts();
  } catch (error) {
    console.error('Error starting the statistics page:', error);
  }
});

// Sets up the year dropdown with all available years
async function setupYearSelector() {
  const years = await getYearsInData();
  const yearSelect = document.getElementById('yearSelect');
  
  baselineYear = Math.min(...years) || 2000;
  
  years.sort((a, b) => b - a);
  
  // If 2020 is not available, use the most recent year
  if (!years.includes(currentYear)) {
    currentYear = years[0] || 2019;
  }
  
  years.forEach(year => {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    if (year === currentYear) option.selected = true;
    yearSelect.appendChild(option);
  });
}

// Sets up all the buttons and dropdown event handlers
function setupEventListeners() {
  document.getElementById('yearSelect').addEventListener('change', (e) => {
    currentYear = parseInt(e.target.value);
    updateAllCharts();
  });
  
  document.getElementById('metricSelect').addEventListener('change', (e) => {
    currentMetric = e.target.value;
    updateAllCharts();
  });
  
  document.getElementById('viewSelect').addEventListener('change', (e) => {
    currentView = e.target.value;
    updateAllCharts();
  });
  
  document.getElementById('exportCsvBtn').addEventListener('click', exportCSV);
  document.getElementById('exportJsonBtn').addEventListener('click', exportJSON);
  document.getElementById('exportBtn').addEventListener('click', exportChart);
}

// Creates the initial empty charts
function createEmptyCharts() {
  createMainChart();
  createTrendsChart();
  createRegionsChart();
}

// Creates the main chart (bar chart)
function createMainChart() {
  const mainChartCtx = document.getElementById('mainChart').getContext('2d');
  mainChart = new Chart(mainChartCtx, {
    type: 'bar',
    data: {
      labels: [],
      datasets: [{
        label: '',
        data: [],
        backgroundColor: metrics[currentMetric].color,
        borderColor: metrics[currentMetric].color,
        borderWidth: 1
      }]
    },
    options: {
      indexAxis: 'y',  // Makes horizontal bars
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const value = context.raw;
              return formatNumber(value, metrics[currentMetric].format);
            }
          }
        }
      }
    }
  });
}

// Creates the trends chart (line chart)
function createTrendsChart() {
  const trendsChartCtx = document.getElementById('trendsChart').getContext('2d');
  trendsChart = new Chart(trendsChartCtx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Global Average',
        data: [],
        borderColor: metrics[currentMetric].color,
        backgroundColor: `${metrics[currentMetric].color}33`,
        fill: true,
        tension: 0.1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              const value = context.raw;
              return formatNumber(value, metrics[currentMetric].format);
            }
          }
        }
      }
    }
  });
}

// Creates the regions chart (radar chart)
function createRegionsChart() {
  const regionsChartCtx = document.getElementById('regionsChart').getContext('2d');
  regionsChart = new Chart(regionsChartCtx, {
    type: 'radar',
    data: {
      labels: Object.keys(regions),
      datasets: [{
        label: metrics[currentMetric].label,
        data: Array(Object.keys(regions).length).fill(0),
        backgroundColor: `${metrics[currentMetric].color}33`,
        borderColor: metrics[currentMetric].color,
        pointBackgroundColor: metrics[currentMetric].color
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          beginAtZero: true
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              const value = context.raw;
              return formatNumber(value, metrics[currentMetric].format);
            }
          }
        }
      }
    }
  });
}

// Updates all charts and the data table
async function updateAllCharts() {
  try {
    updateChartTitle();
    
    await updateMainChart();
    await updateTrendsChart();
    await updateRegionsChart();
    
    await updateDataTable();
  } catch (error) {
    console.error('Error updating charts:', error);
  }
}

// Updates the chart title based on what the user is viewing
function updateChartTitle() {
  const chartTitle = document.getElementById('chartTitle');
  
  if (currentView === 'top10') {
    chartTitle.textContent = `Top 10 Countries by ${metrics[currentMetric].label} (${currentYear})`;
  } else if (currentView === 'bottom10') {
    chartTitle.textContent = `Bottom 10 Countries by ${metrics[currentMetric].label} (${currentYear})`;
  } else {
    chartTitle.textContent = `Global Average ${metrics[currentMetric].label} (${currentYear})`;
  }
}

// Updates the main chart with data
async function updateMainChart() {
  try {
    if (currentView === 'global') {
      await updateGlobalMainChart();
    } else {
      await updateCountryRankingMainChart();
    }
    
    mainChart.update();
  } catch (error) {
    console.error('Error updating main chart:', error);
  }
}

// Updates the main chart for global view
async function updateGlobalMainChart() {
  const globalData = await getGlobalAverageByYear(metrics[currentMetric].key);
  
  const years = Object.keys(globalData).sort();
  const values = years.map(year => globalData[year]);
  
  mainChart.data.labels = years;
  mainChart.data.datasets[0].data = values;
  mainChart.data.datasets[0].label = `Global Average ${metrics[currentMetric].label}`;
  
  mainChart.options.indexAxis = 'x';
  mainChart.options.scales = {
    y: {
      beginAtZero: metrics[currentMetric].key.toLowerCase().includes('percent')
    }
  };
  
  chartData = years.map((year, index) => ({
    year: parseInt(year),
    value: values[index]
  }));
}

// Updates the main chart for top10 or bottom10 view
async function updateCountryRankingMainChart() {
  const isAscending = currentView === 'bottom10';
  const limit = 10;
  
  const countries = await getTopCountriesByMetric(
    metrics[currentMetric].key,
    currentYear,
    limit,
    !isAscending
  );
  
  // Sort countries in the right order
  if (isAscending) {
    countries.sort((a, b) => a.value - b.value);  // Lowest to highest
  } else {
    countries.sort((a, b) => b.value - a.value);  // Highest to lowest
  }
  
  const labels = countries.map(item => item.country);
  const values = countries.map(item => item.value);
  
  mainChart.data.labels = labels;
  mainChart.data.datasets[0].data = values;
  mainChart.data.datasets[0].label = metrics[currentMetric].label;
  
  mainChart.options.indexAxis = 'y';
  mainChart.options.scales = {
    x: {
      beginAtZero: metrics[currentMetric].key.toLowerCase().includes('percent')
    }
  };
  
  chartData = countries;
}

// Updates the trends chart with global average data over time
async function updateTrendsChart() {
  try {
    const globalData = await getGlobalAverageByYear(metrics[currentMetric].key);
    
    const years = Object.keys(globalData).sort();
    const values = years.map(year => globalData[year]);
    
    trendsChart.data.labels = years;
    trendsChart.data.datasets[0].data = values;
    trendsChart.data.datasets[0].label = `Global ${metrics[currentMetric].label}`;
    trendsChart.data.datasets[0].borderColor = metrics[currentMetric].color;
    trendsChart.data.datasets[0].backgroundColor = `${metrics[currentMetric].color}33`;
    
    trendsChart.options.scales = {
      y: {
        beginAtZero: metrics[currentMetric].key.toLowerCase().includes('percent')
      }
    };
    
    trendsChart.update();
  } catch (error) {
    console.error('Error updating trends chart:', error);
  }
}

// Updates the regions radar chart with regional averages
async function updateRegionsChart() {
  try {
    regionsChart.data.labels = Object.keys(regions);
    
    const regionalData = await getRegionalAveragesByYear(
      metrics[currentMetric].key,
      currentYear,
      regions
    );
    
    const regionNames = Object.keys(regions);
    const regionValues = regionNames.map(region => regionalData[region] || 0);
    
    regionsChart.data.datasets[0].data = regionValues;
    regionsChart.data.datasets[0].label = metrics[currentMetric].label;
    regionsChart.data.datasets[0].borderColor = metrics[currentMetric].color;
    regionsChart.data.datasets[0].backgroundColor = `${metrics[currentMetric].color}33`;
    
    regionsChart.update();
  } catch (error) {
    console.error('Error updating regions chart:', error);
  }
}

// Updates the data table with the current chart data
async function updateDataTable() {
  const tableBody = document.getElementById('dataTableBody');
  tableBody.innerHTML = '';
  
  if (chartData.length === 0) return;
  
  try {
    if (currentView === 'global') {
      await updateGlobalViewTable(tableBody);
    } else {
      await updateCountryRankingTable(tableBody);
    }
  } catch (error) {
    console.error('Error updating data table:', error);
    createFallbackTable(tableBody);
  }
}

// Updates the table for global view
async function updateGlobalViewTable(tableBody) {
  chartData.forEach((item, index) => {
    const row = document.createElement('tr');
    
    const rankCell = document.createElement('td');
    rankCell.className = 'px-6 py-4 whitespace-nowrap';
    rankCell.textContent = index + 1;
    row.appendChild(rankCell);
    
    const yearCell = document.createElement('td');
    yearCell.className = 'px-6 py-4 whitespace-nowrap font-medium';
    yearCell.textContent = item.year;
    row.appendChild(yearCell);
    
    const valueCell = document.createElement('td');
    valueCell.className = 'px-6 py-4 whitespace-nowrap';
    valueCell.textContent = formatNumber(item.value, metrics[currentMetric].format);
    row.appendChild(valueCell);
    
    const changeCell = document.createElement('td');
    changeCell.className = 'px-6 py-4 whitespace-nowrap';
    changeCell.textContent = 'N/A';
    row.appendChild(changeCell);
    
    tableBody.appendChild(row);
  });
}

// Updates the table for country ranking views
async function updateCountryRankingTable(tableBody) {
  const countries = chartData.map(item => item.country);
  
  const changes = await getMetricChangeByCountry(
    metrics[currentMetric].key,
    baselineYear,
    currentYear,
    countries
  );
  
  chartData.forEach((item, index) => {
    const row = document.createElement('tr');

    const rankCell = document.createElement('td');
    rankCell.className = 'px-6 py-4 whitespace-nowrap';
    rankCell.textContent = index + 1;
    row.appendChild(rankCell);
    
    const countryCell = document.createElement('td');
    countryCell.className = 'px-6 py-4 whitespace-nowrap font-medium';
    countryCell.textContent = item.country;
    row.appendChild(countryCell);
    
    const valueCell = document.createElement('td');
    valueCell.className = 'px-6 py-4 whitespace-nowrap';
    valueCell.textContent = formatNumber(item.value, metrics[currentMetric].format);
    row.appendChild(valueCell);
    
    const changeCell = document.createElement('td');
    changeCell.className = 'px-6 py-4 whitespace-nowrap';
    
    if (changes[item.country]) {
      const change = changes[item.country].percentageChange;
      const isPositive = change > 0;
      
      changeCell.textContent = `${isPositive ? '+' : ''}${change.toFixed(1)}%`;
      changeCell.classList.add(isPositive ? 'text-green-600' : 'text-red-600');
    } else {
      changeCell.textContent = 'N/A';
    }
    
    row.appendChild(changeCell);
    
    tableBody.appendChild(row);
  });
}

// Creates a simple fallback table if there's an error
function createFallbackTable(tableBody) {
  chartData.forEach((item, index) => {
    const row = document.createElement('tr');
    
    const rankCell = document.createElement('td');
    rankCell.className = 'px-6 py-4 whitespace-nowrap';
    rankCell.textContent = index + 1;
    row.appendChild(rankCell);
    
    const nameCell = document.createElement('td');
    nameCell.className = 'px-6 py-4 whitespace-nowrap font-medium';
    nameCell.textContent = item.country || item.year;
    row.appendChild(nameCell);
    
    const valueCell = document.createElement('td');
    valueCell.className = 'px-6 py-4 whitespace-nowrap';
    valueCell.textContent = formatNumber(item.value, metrics[currentMetric].format);
    row.appendChild(valueCell);
    
    const changeCell = document.createElement('td');
    changeCell.className = 'px-6 py-4 whitespace-nowrap';
    changeCell.textContent = 'N/A';
    row.appendChild(changeCell);
    
    tableBody.appendChild(row);
  });
}

// Exports the data as CSV file
function exportCSV() {
  const filename = `${metrics[currentMetric].label.replace(/\s/g, '-')}-${currentYear}.csv`;
  let csvContent = '';
  
  if (currentView === 'global') {
    csvContent = 'Year,' + metrics[currentMetric].label + '\n';
    csvContent += chartData.map(item => `${item.year},${item.value}`).join('\n');
  } else {
    csvContent = 'Rank,Country,' + metrics[currentMetric].label + '\n';
    csvContent += chartData.map((item, index) => 
      `${index + 1},${item.country},${item.value}`
    ).join('\n');
  }
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

// Exports the data as JSON file
function exportJSON() {
  const filename = `${metrics[currentMetric].label.replace(/\s/g, '-')}-${currentYear}.json`;
  const jsonContent = JSON.stringify(chartData, null, 2);
  
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

// Exports the main chart as PNG image
function exportChart() {
  const canvas = document.getElementById('mainChart');
  const image = canvas.toDataURL('image/png');
  
  const link = document.createElement('a');
  link.href = image;
  link.download = `${metrics[currentMetric].label.replace(/\s/g, '-')}-${currentYear}.png`;
  link.click();
} 