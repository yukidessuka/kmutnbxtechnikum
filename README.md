# EcoSphere - Renewable Energy Dashboard

A modern, interactive platform that visualizes global sustainable energy data using JavaScript with CesiumJS. 

![EcoSphere Dashboard](src/assets/logo.png)

## Project Overview

EcoSphere is a web-based dashboard that allows users to explore renewable energy data from the past 20 years for countries worldwide. The platform features:

- **Interactive 3D Globe**: Visualize renewable energy data on a 3D globe using CesiumJS
- **Country Comparison**: Compare renewable energy metrics between two countries 
- **Future Predictions**: View projected statistics based on historical trends
- **Interactive Timeline**: Track changes in renewable energy adoption over time
- **Data Export**: Download statistics and visualizations in various formats

## Technologies Used

- HTML5, CSS3, JavaScript (ES6+)
- [CesiumJS](https://cesium.com/platform/cesiumjs/) for 3D globe visualization
- [Chart.js](https://www.chartjs.org/) for data visualization charts
- [TailwindCSS](https://tailwindcss.com/) for responsive styling
- Custom utilities for data processing and forecasting

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Edge, or Safari)
- Local web server (optional, for development)

### Running the Project

1. Clone the repository:
   ```
   git clone https://github.com/yukidessuka/kmutnbxtechnikum
   cd kmutnbxtechnikum
   ```

2. Install dependencies and run the project:

   ```bash
   # Install dependencies
   npm install

   # Start the development server
   npx http-server

   # Visit http://localhost:8080 in your browser
   ```

## Features

### 3D Globe Visualization

- Interactive globe with country selection
- Color-coded countries based on renewable energy percentage
- Timeline to visualize changes over the years
- Country information panel with detailed statistics

### Country Comparison

- Compare renewable energy metrics between two countries
- Side-by-side visualization of key statistics
- Historical trend analysis and comparison
- Future predictions for both countries

### Statistics Dashboard

- Overview of global renewable energy trends
- Top and bottom countries by various metrics
- Regional comparisons and analysis
- Data export in multiple formats

## Data Sources

The dataset used in this project contains information on sustainable energy production, access to electricity, GDP per capita, and CO2 emissions for countries worldwide over the past 20 years. The data has been compiled from multiple sources including the World Bank, International Energy Agency, and United Nations Statistics Division.