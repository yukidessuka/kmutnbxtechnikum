import { CesiumGlobe } from '../components/CesiumGlobe.js';
import { TimelineComponent } from '../components/TimelineComponent.js';
import { 
  getCountryDataForYear, 
  getRenewableEnergyPercentage, 
  formatNumber, 
  predictFutureValue,
  getCountryData,
  getYearsInData,
  loadGlobalData
} from '../utils/dataUtils.js';

// Global variables
let globe;
let timeline;
let selectedCountry = null;
let energyMixChart = null;

// This function runs when the page loads
document.addEventListener('DOMContentLoaded', async () => {
  // Step 1: Load the global data
  await loadGlobalData();
  
  // Step 2: Get the years we have data for
  let years = await getYearsInData();
  if (!years || years.length === 0) {
    // If no years found, create a default range from 2000 to 2020
    years = [];
    for (let i = 2000; i <= 2020; i++) {
      years.push(i);
    }
  }
  
  // Step 3: Find the most recent year in our data
  const latestYear = years.length > 0 ? years[years.length - 1] : 2020;
  
  // Step 4: Create the timeline at the bottom of the screen
  initializeTimeline(years, latestYear);
  
  // Step 5: Create the 3D globe
  await initializeGlobe();
  
  // Step 6: Set up the dropdown to change metrics
  setupMetricSelector();
  
  // Step 7: Set up the compare link
  setupCompareLink();
});

// Creates the timeline component
function initializeTimeline(years, latestYear) {
  timeline = new TimelineComponent('timelineContainer', {
    showPlayPause: true,
    currentYear: latestYear,
    availableYears: years,
    onYearChange: (year) => {
      globe.setYear(year);
      
      if (selectedCountry) {
        updateCountryInfo(selectedCountry, year);
      }
    }
  });
}

// Creates the 3D globe
async function initializeGlobe() {
  globe = new CesiumGlobe('cesiumContainer', {
    onCountrySelected: (country) => {
      selectedCountry = country;
      
      updateCountryInfo(country, timeline.getCurrentYear());
      
      updatePredictions(country);
    }
  });
  
  await globe.initialize();
  globe.addLegend('legendContainer');
}

// Sets up the metric selector dropdown
function setupMetricSelector() {
  const metricSelect = document.getElementById('metricSelect');
  metricSelect.addEventListener('change', () => {
    alert('This feature will be implemented in a future update.');
  });
}

// Sets up the compare countries link
function setupCompareLink() {
  const compareLink = document.getElementById('compareLink');
  compareLink.addEventListener('click', (e) => {
    e.preventDefault();
    
    if (selectedCountry) {
      window.location.href = `compare.html?country1=${encodeURIComponent(selectedCountry)}`;
    }
  });
}

// Updates the country information sidebar
async function updateCountryInfo(country, year) {
  const countryDataContainer = document.getElementById('countryDataContainer');
  countryDataContainer.classList.remove('hidden');
  
  document.getElementById('noPredictions').classList.add('hidden');
  document.getElementById('predictionsContainer').classList.remove('hidden');
  
  document.getElementById('countryName').textContent = country;
  document.getElementById('predictionCountryName').textContent = country;
  
  const countryData = await getCountryDataForYear(country, year);
  
  if (countryData) {
    updateCountryMetrics(country, year, countryData);
    updateEnergyMixChart(countryData);
  } else {
    showNoDataAvailable();
  }
}

// Updates the country metrics in the sidebar
async function updateCountryMetrics(country, year, countryData) {
  const renewableEnergy = await getRenewableEnergyPercentage(country, year);
  
  const electricityAccess = countryData['Access to electricity (% of population)'];
  const gdpPerCapita = countryData['gdp_per_capita'];
  const co2Emissions = countryData['Value_co2_emissions_kt_by_country'];
  
  document.getElementById('renewableEnergy').textContent = formatMetric(renewableEnergy, '%');
  document.getElementById('electricityAccess').textContent = formatMetric(electricityAccess, '%');
  document.getElementById('gdpPerCapita').textContent = formatMetric(gdpPerCapita, '$');
  document.getElementById('co2Emissions').textContent = formatMetric(co2Emissions, 'kt');
}

// Helper function to format metric values
function formatMetric(value, unit) {
  if (value === undefined || value === null || isNaN(value)) {
    return 'N/A';
  }
  
  if (unit === '%') {
    return `${value.toFixed(1)}%`;
  } else if (unit === '$') {
    return `$${value.toLocaleString()}`;
  } else if (unit === 'kt') {
    return `${value.toLocaleString()} kt`;
  }
  
  return value.toString();
}

// Shows "No data available" when we don't have data
function showNoDataAvailable() {
  document.getElementById('renewableEnergy').textContent = 'N/A';
  document.getElementById('electricityAccess').textContent = 'N/A';
  document.getElementById('gdpPerCapita').textContent = 'N/A';
  document.getElementById('co2Emissions').textContent = 'N/A';
  
  // Clear energy mix chart
  if (energyMixChart) {
    energyMixChart.destroy();
    energyMixChart = null;
  }
}

// Updates the energy mix chart
function updateEnergyMixChart(countryData) {
  const canvas = document.getElementById('energyMixChart');
  const ctx = canvas.getContext('2d');
  
  const fossilFuels = countryData['Electricity from fossil fuels (TWh)'] || 0;
  const renewables = countryData['Electricity from renewables (TWh)'] || 0;
  
  let nuclear = 0;
  if (countryData['Electricity from nuclear (TWh)'] !== undefined) {
    nuclear = countryData['Electricity from nuclear (TWh)'];
  } else if (countryData['Nuclear electricity (TWh)'] !== undefined) {
    nuclear = countryData['Nuclear electricity (TWh)'];
  }
  
  if (fossilFuels === 0 && renewables === 0 && nuclear === 0) {
    showNoEnergyData(canvas, ctx);
    return;
  }
  
  if (energyMixChart) {
    updateExistingChart(fossilFuels, renewables, nuclear);
    return;
  }
  
  // Create a new chart
  createNewEnergyChart(ctx, fossilFuels, renewables, nuclear);
}

// Shows "No energy data" message on the canvas
function showNoEnergyData(canvas, ctx) {
  if (energyMixChart) {
    energyMixChart.destroy();
    energyMixChart = null;
  }
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = '14px Arial';
  ctx.fillStyle = '#333';
  ctx.textAlign = 'center';
  ctx.fillText('No energy mix data available', canvas.width/2, canvas.height/2);
}

// Updates an existing chart with new data
function updateExistingChart(fossilFuels, renewables, nuclear) {
  energyMixChart.data.datasets[0].data = [fossilFuels, renewables, nuclear];
  energyMixChart.update();
}

// Creates a new energy mix chart
function createNewEnergyChart(ctx, fossilFuels, renewables, nuclear) {
  energyMixChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Fossil Fuels', 'Renewables', 'Nuclear'],
      datasets: [{
        data: [fossilFuels, renewables, nuclear],
        backgroundColor: ['#fc8181', '#48bb78', '#63b3ed'],
        borderColor: ['#fff', '#fff', '#fff'],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        },
        tooltip: {
          callbacks: {
            label: function(tooltipItem) {
              const value = tooltipItem.raw || 0;
              const dataset = tooltipItem.dataset || { data: [] };
              const total = dataset.data.reduce((a, b) => a + b, 0);
              const percentage = total > 0 ? (value / total * 100).toFixed(1) : 0;
              const label = tooltipItem.label || '';
              
              return `${label}: ${value.toFixed(1)} TWh (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

// Updates the future predictions for a country
async function updatePredictions(country) {
  const predictionsContainer = document.getElementById('predictionsContainer');
  const noPredictions = document.getElementById('noPredictions');
  const tableBody = document.getElementById('predictionsTableBody');
  
  if (!country) {
    predictionsContainer.classList.add('hidden');
    noPredictions.classList.remove('hidden');
    return;
  }
  
  const countryData = await getCountryData(country);
  
  if (!countryData || countryData.length < 2) {
    predictionsContainer.classList.add('hidden');
    noPredictions.classList.remove('hidden');
    return;
  }
  
  tableBody.innerHTML = '';
  
  const metrics = [
    { key: 'Renewables (% equivalent primary energy)', label: 'Renewable Energy' },
    { key: 'Access to electricity (% of population)', label: 'Electricity Access' },
    { key: 'gdp_per_capita', label: 'GDP per Capita' },
    { key: 'Value_co2_emissions_kt_by_country', label: 'CO2 Emissions' }
  ];
  
  const futureYears = [2025, 2030, 2040, 2050];
  
  metrics.forEach(metric => {
    createPredictionRow(metric, countryData, futureYears, tableBody);
  });
  
  predictionsContainer.classList.remove('hidden');
  noPredictions.classList.add('hidden');
}

// Creates a row in the predictions table for a specific metric
function createPredictionRow(metric, countryData, futureYears, tableBody) {
  const dataPoints = countryData
    .filter(item => item[metric.key] !== undefined && item[metric.key] !== null && !isNaN(item[metric.key]))
    .map(item => ({
      x: item.Year,
      y: item[metric.key]
    }))
    .sort((a, b) => a.x - b.x);
  
  // Skip metrics with insufficient data
  if (dataPoints.length < 2) {
    return;
  }
  
  const row = document.createElement('tr');
  
  const metricCell = document.createElement('td');
  metricCell.className = 'px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900';
  metricCell.textContent = metric.label;
  row.appendChild(metricCell);
  
  futureYears.forEach(year => {
    const prediction = predictFutureValue(dataPoints, year);
    
    const predictionCell = document.createElement('td');
    predictionCell.className = 'px-6 py-4 whitespace-nowrap text-sm text-gray-500';
    
    predictionCell.textContent = formatPrediction(prediction, metric.key);
    
    row.appendChild(predictionCell);
  });
  
  tableBody.appendChild(row);
}

// Formats a prediction value based on its metric type
function formatPrediction(prediction, metricKey) {
  if (prediction === null) {
    return 'N/A';
  }
  
  if (metricKey.includes('percentage') || metricKey.includes('Renewables')) {
    return `${prediction.toFixed(1)}%`;
  } else if (metricKey.includes('gdp')) {
    return `$${prediction.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  } else if (metricKey.includes('co2')) {
    return `${prediction.toLocaleString(undefined, { maximumFractionDigits: 0 })} kt`;
  }
  
  return prediction.toFixed(2);
} 