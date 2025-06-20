let allData = [];
let chartInstances = {};
let currentDataView = [];

// Metrik-Konfiguration
const METRICS = {
    'renewable': { 
        key: 'Renewable energy share in the total final energy consumption (%)', 
        label: 'Anteil Erneuerbarer Energien',
        unit: '%'
    },
    'electricity': { 
        key: 'Access to electricity (% of population)', 
        label: 'Zugang zu Elektrizität',
        unit: '%'
    },
    'co2': { 
        key: 'Value_co2_emissions_kt_by_country', 
        label: 'CO₂-Emissionen',
        unit: 'kt'
    },
    'gdp': { 
        key: 'gdp_per_capita', 
        label: 'BIP pro Kopf',
        unit: '$'
    }
};

// DOM-Elemente
const yearSelect = document.getElementById('yearSelect');
const metricSelect = document.getElementById('metricSelect');
const viewSelect = document.getElementById('viewSelect');
const chartTitle = document.getElementById('chartTitle');
const dataTableBody = document.getElementById('dataTableBody');
const exportBtn = document.getElementById('exportBtn');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const exportJsonBtn = document.getElementById('exportJsonBtn');

// Initialisiert das Dashboard durch Laden der Daten und Einrichten der Event-Listener
async function initializeDashboard() {
    try {
        const response = await fetch('../data/global-data-on-sustainable-energy.json');
        if (!response.ok) throw new Error(`HTTP-Fehler! Status: ${response.status}`);
        allData = await response.json();

        // Filtert Nicht-Länder-Entitäten für die Hauptauswahl heraus
        const excludedEntities = ['World', 'Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania'];
        const countryData = allData.filter(d => !excludedEntities.includes(d.Entity));

        populateYearSelect(countryData);
        setupEventListeners();
        updateDashboard();
    } catch (error) {
        console.error("Fehler bei der Initialisierung des Dashboards:", error);
        chartTitle.textContent = "Fehler beim Laden der Daten. Bitte aktualisieren Sie die Seite.";
    }
}

// Füllt das Dropdown-Menü für die Jahresauswahl
function populateYearSelect(data) {
    const years = [...new Set(data.map(item => item.Year))].sort((a, b) => b - a);
    years.forEach(year => {
        const option = new Option(year, year);
        yearSelect.add(option);
    });
    yearSelect.value = "2020"; // Standardmäßig das letzte vollständige Jahr
}

// Richtet Event-Listener für alle Steuerelemente ein
function setupEventListeners() {
    [yearSelect, metricSelect, viewSelect].forEach(select => {
        select.addEventListener('change', updateDashboard);
    });
    exportBtn.addEventListener('click', () => exportData('csv'));
    exportCsvBtn.addEventListener('click', () => exportData('csv'));
    exportJsonBtn.addEventListener('click', () => exportData('json'));
}

// Hauptfunktion zur Aktualisierung aller Komponenten des Dashboards
function updateDashboard() {
    updateMainView();
    updateTrendsChart();
    updateRegionsChart();
}

// Aktualisiert die Hauptansicht (Chart und Tabelle) basierend auf der Auswahl
function updateMainView() {
    const year = parseInt(yearSelect.value);
    const metric = metricSelect.value;
    const view = viewSelect.value;
    const metricConfig = METRICS[metric];

    let dataForYear = allData.filter(d => 
        d.Year === year && 
        d[metricConfig.key] != null && 
        !isNaN(d[metricConfig.key]) &&
        d.Entity.match(/^[A-Z]/) // Filter für Entitäten, die mit einem Großbuchstaben beginnen (Länder)
    );

    let title = '';
    
    if (view === 'top10' || view === 'bottom10') {
        const sortOrder = (view === 'top10') ? (a, b) => b[metricConfig.key] - a[metricConfig.key] : (a, b) => a[metricConfig.key] - b[metricConfig.key];
        currentDataView = dataForYear.sort(sortOrder).slice(0, 10);
        title = `${view === 'top10' ? 'Top' : 'Letzte'} 10 Länder nach ${metricConfig.label} (${year})`;
    } else { // Globale Durchschnittsansicht
        const globalEntry = allData.find(d => d.Entity === 'World' && d.Year === year);
        currentDataView = globalEntry ? [globalEntry] : [];
        title = `Globaler Durchschnitt für ${metricConfig.label} (${year})`;
    }

    chartTitle.textContent = title;
    updateMainChart(currentDataView, metricConfig);
    updateDataTable(currentDataView, metricConfig);
}

// Rendert oder aktualisiert das Haupt-Balkendiagramm
function updateMainChart(data, metricConfig) {
    if (chartInstances.mainChart) {
        chartInstances.mainChart.destroy();
    }
    const ctx = document.getElementById('mainChart').getContext('2d');
    chartInstances.mainChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.Entity),
            datasets: [{
                label: `${metricConfig.label} (${metricConfig.unit})`,
                data: data.map(d => d[metricConfig.key]),
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
        }
    });
}

// Rendert oder aktualisiert die Datentabelle
function updateDataTable(data, metricConfig) {
    dataTableBody.innerHTML = '';
    data.forEach((item, index) => {
        const startYearData = allData.find(d => d.Entity === item.Entity && d.Year === 2000);
        const startValue = startYearData ? startYearData[metricConfig.key] : null;
        const currentValue = item[metricConfig.key];
        let changeHtml = '<span class="text-gray-400">N/A</span>';
        if (startValue != null && currentValue != null) {
            const change = currentValue - startValue;
            const changePercent = (startValue !== 0) ? (change / startValue) * 100 : Infinity;
            const color = change > 0 ? 'text-green-600' : 'text-red-600';
            const icon = change > 0 ? '▲' : '▼';
            if (change.toFixed(2) !== '0.00') {
               changeHtml = `<span class="${color}">${icon} ${Math.abs(changePercent).toFixed(1)}%</span>`;
            } else {
               changeHtml = `<span>-</span>`;
            }
        }

        const row = `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${index + 1}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${item.Entity}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${parseFloat(currentValue).toLocaleString('de-DE', {maximumFractionDigits: 2})} ${metricConfig.unit}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">${changeHtml}</td>
            </tr>
        `;
        dataTableBody.innerHTML += row;
    });
}

// Rendert oder aktualisiert das "Trends über Zeit"-Liniendiagramm
function updateTrendsChart() {
    const metricConfig = METRICS[metricSelect.value];
    
    // Versuche zuerst, weltweite Daten zu finden
    let trendData = allData.filter(d => d.Entity === 'World' && d.Year >= 2000 && d.Year <= 2020);
    
    // Wenn keine Weltdaten gefunden wurden, verwende Durchschnittswerte aller Länder
    if (trendData.length === 0) {
        const years = [...new Set(allData.filter(d => d.Year >= 2000 && d.Year <= 2020).map(d => d.Year))].sort();
        
        trendData = years.map(year => {
            const countriesForYear = allData.filter(d => 
                d.Year === year && 
                d[metricConfig.key] != null && 
                !isNaN(d[metricConfig.key]) && 
                d.Entity.match(/^[A-Z]/)
            );
            
            if (countriesForYear.length > 0) {
                const avgValue = countriesForYear.reduce((sum, d) => sum + d[metricConfig.key], 0) / countriesForYear.length;
                return {
                    Entity: 'Global Average',
                    Year: year,
                    [metricConfig.key]: avgValue
                };
            }
            return null;
        }).filter(d => d !== null);
    }
    
    const years = trendData.map(d => d.Year).sort((a, b) => a - b);
    const trendValues = years.map(year => {
        const record = trendData.find(d => d.Year === year);
        return record ? record[metricConfig.key] : null;
    });

    if (chartInstances.trendsChart) chartInstances.trendsChart.destroy();
    const ctx = document.getElementById('trendsChart').getContext('2d');
    chartInstances.trendsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: years,
            datasets: [{
                label: `Globaler Durchschnitt ${metricConfig.label}`,
                data: trendValues,
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                fill: true,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${parseFloat(context.raw).toLocaleString('de-DE', {maximumFractionDigits: 2})} ${metricConfig.unit}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    title: {
                        display: true,
                        text: metricConfig.label + ' (' + metricConfig.unit + ')'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Jahr'
                    }
                }
            }
        }
    });
}

// Rendert oder aktualisiert das "Regionaler Vergleich"-Polardiagramm
function updateRegionsChart() {
    const year = parseInt(yearSelect.value);
    const metricConfig = METRICS[metricSelect.value];
    const regionNames = ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania'];
    
    // Prüft, ob die Regionendaten existieren
    let hasRegionData = false;
    for (const region of regionNames) {
        if (allData.some(d => d.Entity === region && d.Year === year && d[metricConfig.key] != null)) {
            hasRegionData = true;
            break;
        }
    }
    
    // Wenn keine direkten Regionendaten existieren, gruppiere Länderdaten nach Kontinenten
    let regionData = [];
    let labels = [];
    
    if (hasRegionData) {
        // Verwende direkte Regionendaten
        labels = regionNames;
        regionData = regionNames.map(region => {
            const record = allData.find(d => d.Entity === region && d.Year === year);
            return record && record[metricConfig.key] !== null ? record[metricConfig.key] : 0;
        });
    } else {
        // Erstelle einen Regionen-Mapping-Object
        const regionMapping = {
            'Africa': ['Algeria', 'Angola', 'Benin', 'Botswana', 'Burkina Faso', 'Burundi', 'Cameroon', 'Central African Republic', 'Chad', 'Congo', 'Djibouti', 'Egypt', 'Equatorial Guinea', 'Eritrea', 'Ethiopia', 'Gabon', 'Gambia', 'Ghana', 'Guinea', 'Guinea-Bissau', 'Ivory Coast', 'Kenya', 'Lesotho', 'Liberia', 'Libya', 'Madagascar', 'Malawi', 'Mali', 'Mauritania', 'Mauritius', 'Morocco', 'Mozambique', 'Namibia', 'Niger', 'Nigeria', 'Rwanda', 'Senegal', 'Sierra Leone', 'Somalia', 'South Africa', 'South Sudan', 'Sudan', 'Swaziland', 'Tanzania', 'Togo', 'Tunisia', 'Uganda', 'Zambia', 'Zimbabwe'],
            'Asia': ['Afghanistan', 'Armenia', 'Azerbaijan', 'Bahrain', 'Bangladesh', 'Bhutan', 'Brunei', 'Cambodia', 'China', 'Cyprus', 'Georgia', 'India', 'Indonesia', 'Iran', 'Iraq', 'Israel', 'Japan', 'Jordan', 'Kazakhstan', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Lebanon', 'Malaysia', 'Maldives', 'Mongolia', 'Myanmar', 'Nepal', 'North Korea', 'Oman', 'Pakistan', 'Palestine', 'Philippines', 'Qatar', 'Saudi Arabia', 'Singapore', 'South Korea', 'Sri Lanka', 'Syria', 'Taiwan', 'Tajikistan', 'Thailand', 'Timor-Leste', 'Turkey', 'Turkmenistan', 'United Arab Emirates', 'Uzbekistan', 'Vietnam', 'Yemen'],
            'Europe': ['Albania', 'Andorra', 'Austria', 'Belarus', 'Belgium', 'Bosnia and Herzegovina', 'Bulgaria', 'Croatia', 'Czech Republic', 'Denmark', 'Estonia', 'Finland', 'France', 'Germany', 'Greece', 'Hungary', 'Iceland', 'Ireland', 'Italy', 'Latvia', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Malta', 'Moldova', 'Monaco', 'Montenegro', 'Netherlands', 'North Macedonia', 'Norway', 'Poland', 'Portugal', 'Romania', 'Russia', 'San Marino', 'Serbia', 'Slovakia', 'Slovenia', 'Spain', 'Sweden', 'Switzerland', 'Ukraine', 'United Kingdom', 'Vatican City'],
            'North America': ['Antigua and Barbuda', 'Bahamas', 'Barbados', 'Belize', 'Canada', 'Costa Rica', 'Cuba', 'Dominica', 'Dominican Republic', 'El Salvador', 'Grenada', 'Guatemala', 'Haiti', 'Honduras', 'Jamaica', 'Mexico', 'Nicaragua', 'Panama', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Trinidad and Tobago', 'United States'],
            'South America': ['Argentina', 'Bolivia', 'Brazil', 'Chile', 'Colombia', 'Ecuador', 'Guyana', 'Paraguay', 'Peru', 'Suriname', 'Uruguay', 'Venezuela'],
            'Oceania': ['Australia', 'Fiji', 'Kiribati', 'Marshall Islands', 'Micronesia', 'Nauru', 'New Zealand', 'Palau', 'Papua New Guinea', 'Samoa', 'Solomon Islands', 'Tonga', 'Tuvalu', 'Vanuatu']
        };
        
        // Aggregiere Daten nach Region
        const regionAggregates = {};
        const regionCounts = {};
        
        for (const region in regionMapping) {
            regionAggregates[region] = 0;
            regionCounts[region] = 0;
        }
        
        // Sammle die Daten für jedes Land und aggregiere nach Region
        allData.filter(d => d.Year === year && d[metricConfig.key] != null).forEach(d => {
            for (const region in regionMapping) {
                if (regionMapping[region].includes(d.Entity)) {
                    regionAggregates[region] += d[metricConfig.key];
                    regionCounts[region]++;
                    break;
                }
            }
        });
        
        // Berechne den Durchschnitt für jede Region
        labels = Object.keys(regionAggregates);
        regionData = labels.map(region => {
            return regionCounts[region] > 0 ? regionAggregates[region] / regionCounts[region] : 0;
        });
    }

    if (chartInstances.regionsChart) chartInstances.regionsChart.destroy();
    const ctx = document.getElementById('regionsChart').getContext('2d');
    chartInstances.regionsChart = new Chart(ctx, {
        type: 'polarArea',
        data: {
            labels: labels,
            datasets: [{
                label: metricConfig.label,
                data: regionData,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(153, 102, 255, 0.7)',
                    'rgba(255, 159, 64, 0.7)'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { position: 'right' },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: ${parseFloat(context.raw).toLocaleString('de-DE', {maximumFractionDigits: 2})} ${metricConfig.unit}`;
                        }
                    }
                }
            }
        }
    });
}

// Exportiert die aktuelle Datenansicht in eine Datei
function exportData(format) {
    if (currentDataView.length === 0) {
        alert("Keine Daten zum Exportieren vorhanden.");
        return;
    }

    const year = yearSelect.value;
    const metric = metricSelect.value;
    const view = viewSelect.value;
    const filename = `${view}_${metric}_${year}`;

    if (format === 'csv') {
        const headers = Object.keys(currentDataView[0]).join(',');
        const rows = currentDataView.map(row => Object.values(row).join(',')).join('\n');
        const csvContent = `data:text/csv;charset=utf-8,${headers}\n${rows}`;
        triggerDownload(csvContent, `${filename}.csv`);
    } else if (format === 'json') {
        const jsonContent = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(currentDataView, null, 2))}`;
        triggerDownload(jsonContent, `${filename}.json`);
    }
}

// Erstellt einen temporären Link und löst einen Dateidownload aus
function triggerDownload(content, filename) {
    const link = document.createElement('a');
    link.setAttribute('href', content);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Initialisiert das Dashboard beim Laden der Seite
document.addEventListener('DOMContentLoaded', initializeDashboard);