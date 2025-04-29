import { CountryComparison } from '../components/CountryComparison.js';

document.addEventListener('DOMContentLoaded', async () => {
  const urlParameters = new URLSearchParams(window.location.search);
  const firstCountry = urlParameters.get('country1');
  const secondCountry = urlParameters.get('country2');
  
  const countryComparer = new CountryComparison('comparisonContainer', {
    showPredictions: true,
    defaultCountries: {
      first: firstCountry || null,
      second: secondCountry || null
    }
  });
  
  function updateUrlWithCountries(firstCountryName, secondCountryName) {
    const parameters = new URLSearchParams();
    
    if (firstCountryName) parameters.append('country1', firstCountryName);
    if (secondCountryName) parameters.append('country2', secondCountryName);
    
    const newUrl = `${window.location.pathname}?${parameters.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }
  
  document.addEventListener('countrySelected', (event) => {
    if (event.detail && (event.detail.position === 'first' || event.detail.position === 'second')) {
      const selectedPosition = event.detail.position;
      const selectedCountry = event.detail.country;
      
      if (selectedPosition === 'first') {
        updateUrlWithCountries(selectedCountry, countryComparer.countries.second);
      } else {
        updateUrlWithCountries(countryComparer.countries.first, selectedCountry);
      }
    }
  });
});