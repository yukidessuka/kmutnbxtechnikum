// Hält Chart-Instanzen, um sie vor dem Neuzeichnen zu zerstören
let renewableChartInstance, co2ChartInstance;
let allData = [];

// DOM-Elemente
const countrySelect1 = document.getElementById('countrySelect1');
const countrySelect2 = document.getElementById('countrySelect2');
const resultsContainer = document.getElementById('resultsContainer');
const initialMessage = document.getElementById('initialMessage');
const country1SummaryEl = document.getElementById('country1-summary');
const country2SummaryEl = document.getElementById('country2-summary');
const renewableChartCanvas = document.getElementById('renewableChart').getContext('2d');
const co2ChartCanvas = document.getElementById('co2Chart').getContext('2d');

// Lädt und verarbeitet die Energiedaten
async function loadData() {
  try {
    const response = await fetch('../data/global-data-on-sustainable-energy.json');
    if (!response.ok) {
        throw new Error(`HTTP-Fehler! Status: ${response.status}`);
    }
    allData = await response.json();
    
    // Eindeutige Ländernamen ermitteln und sortieren
    const countryNames = [...new Set(allData.map(item => item.Entity))].sort();
    
    populateDropdowns(countryNames);
  } catch (error) {
    console.error("Fehler beim Laden oder Verarbeiten der Daten:", error);
    initialMessage.textContent = "Fehler: Daten konnten nicht geladen werden. Bitte versuchen Sie, die Seite neu zu laden.";
  }
}

// Füllt die Dropdown-Menüs zur Länderauswahl
function populateDropdowns(countryNames) {
  countryNames.forEach(name => {
    const option1 = new Option(name, name);
    const option2 = new Option(name, name);
    countrySelect1.add(option1);
    countrySelect2.add(option2);
  });
}

// Formatiert eine Zahl für die Anzeige, gibt 'N/A' zurück, falls null/undefined
function formatNumber(value, fractionDigits = 2) {
    if (value === null || typeof value === 'undefined') return 'N/A';
    return Number(value).toLocaleString('de-DE', { // 'de-DE' für deutsche Zahlenformate
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits
    });
}

// Aktualisiert die gesamte Vergleichsansicht bei Auswahländerung
function updateComparison() {
  const country1 = countrySelect1.value;
  const country2 = countrySelect2.value;

  if (!country1 || !country2) {
    resultsContainer.classList.add('hidden');
    initialMessage.classList.remove('hidden');
    return;
  }
  
  resultsContainer.classList.remove('hidden');
  initialMessage.classList.add('hidden');

  const data1 = allData.filter(d => d.Entity === country1 && d.Year <= 2020).sort((a, b) => a.Year - b.Year);
  const data2 = allData.filter(d => d.Entity === country2 && d.Year <= 2020).sort((a, b) => a.Year - b.Year);
  
  updateSummary(country1, data1, country2, data2);
  updateCharts(country1, data1, country2, data2);
}

// Aktualisiert die Zusammenfassungskarten mit den neuesten Daten (von 2020)
function updateSummary(name1, data1, name2, data2) {
    const latestData1 = data1.find(d => d.Year === 2020) || data1[data1.length - 1] || {};
    const latestData2 = data2.find(d => d.Year === 2020) || data2[data2.length - 1] || {};

    country1SummaryEl.innerHTML = `
        <h3 class="text-xl font-bold mb-2">${name1}</h3>
        <ul class="space-y-1 text-sm">
            <li><strong>Anteil erneuerbarer Energien:</strong> ${formatNumber(latestData1['Renewable energy share in the total final energy consumption (%)'])}%</li>
            <li><strong>Zugang zu Elektrizität:</strong> ${formatNumber(latestData1['Access to electricity (% of population)'])}%</li>
            <li><strong>CO₂-Emissionen (kt):</strong> ${formatNumber(latestData1['Value_co2_emissions_kt_by_country'], 0)}</li>
            <li><strong>BIP pro Kopf:</strong> $${formatNumber(latestData1['gdp_per_capita'], 0)}</li>
        </ul>`;

    country2SummaryEl.innerHTML = `
        <h3 class="text-xl font-bold mb-2">${name2}</h3>
        <ul class="space-y-1 text-sm">
            <li><strong>Anteil erneuerbarer Energien:</strong> ${formatNumber(latestData2['Renewable energy share in the total final energy consumption (%)'])}%</li>
            <li><strong>Zugang zu Elektrizität:</strong> ${formatNumber(latestData2['Access to electricity (% of population)'])}%</li>
            <li><strong>CO₂-Emissionen (kt):</strong> ${formatNumber(latestData2['Value_co2_emissions_kt_by_country'], 0)}</li>
            <li><strong>BIP pro Kopf:</strong> $${formatNumber(latestData2['gdp_per_capita'], 0)}</li>
        </ul>`;
}

// Erstellt oder aktualisiert die Vergleichscharts
function updateCharts(name1, data1, name2, data2) {
    const years = [...new Set([...data1.map(d => d.Year), ...data2.map(d => d.Year)])].sort();
    
    const getMetricByYear = (data, year, metric) => {
        const record = data.find(d => d.Year === year);
        return record ? record[metric] : null; // `null` erzeugt eine Lücke in der Chart.js-Linie
    };

    const renewableData1 = years.map(year => getMetricByYear(data1, year, 'Renewable energy share in the total final energy consumption (%)'));
    const renewableData2 = years.map(year => getMetricByYear(data2, year, 'Renewable energy share in the total final energy consumption (%)'));

    const co2Data1 = years.map(year => getMetricByYear(data1, year, 'Value_co2_emissions_kt_by_country'));
    const co2Data2 = years.map(year => getMetricByYear(data2, year, 'Value_co2_emissions_kt_by_country'));

    // Alte Charts vor dem Neuerstellen zerstören
    if (renewableChartInstance) renewableChartInstance.destroy();
    if (co2ChartInstance) co2ChartInstance.destroy();
    
    renewableChartInstance = createLineChart(renewableChartCanvas, years, name1, renewableData1, name2, renewableData2);
    co2ChartInstance = createLineChart(co2ChartCanvas, years, name1, co2Data1, name2, co2Data2);
}

// Generische Funktion zum Erstellen eines Liniendiagramms
function createLineChart(ctx, labels, label1, data1, label2, data2) {
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: label1,
                    data: data1,
                    borderColor: 'rgba(54, 162, 235, 1)',
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    fill: false,
                    tension: 0.1
                },
                {
                    label: label2,
                    data: data2,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    fill: false,
                    tension: 0.1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                }
            }
        }
    });
}

// Initiales Setup
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    countrySelect1.addEventListener('change', updateComparison);
    countrySelect2.addEventListener('change', updateComparison);
});