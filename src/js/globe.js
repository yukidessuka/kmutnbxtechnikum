import * as Cesium from "https://cesium.com/downloads/cesiumjs/releases/1.127/Build/CesiumUnminified/index.js";

async function initializeGlobe() {
  const viewer = new Cesium.Viewer("cesiumContainer", {
    terrainProvider: new Cesium.EllipsoidTerrainProvider(),
    imageryProvider: new Cesium.OpenStreetMapImageryProvider(),
    baseLayerPicker: false,
  });

  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(10, 20, 20000000),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-90),
    },
  });

  // GeoJSON laden
  const geoResponse = await fetch(
      "https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json"
  );
  const geojson = await geoResponse.json();

  // Statistikdaten laden
  const statsResponse = await fetch("../data/global-data-on-sustainable-energy.json");
  const statsData = await statsResponse.json();

  // Hilfsfunktion: Polygon-Hierarchie erzeugen
  function createHierarchy(coords) {
    if (!coords || coords.length === 0) return null;
    if (typeof coords[0][0] === "number") {
      const positions = coords.map((pos) => Cesium.Cartesian3.fromDegrees(pos[0], pos[1]));
      return new Cesium.PolygonHierarchy(positions);
    } else {
      return createHierarchy(coords[0]);
    }
  }

  // GeoJSON-Features hinzufügen
  geojson.features.forEach((feature) => {
    const coords = feature.geometry.coordinates;
    const type = feature.geometry.type;
    const name = feature.properties.name || feature.properties.ADMIN || feature.properties.NAME || "Unknown";

    if (type === "MultiPolygon") {
      coords.forEach((polygonCoords) => {
        const polyHierarchy = createHierarchy(polygonCoords);
        if (polyHierarchy) {
          viewer.entities.add({
            name: name,
            polygon: {
              hierarchy: polyHierarchy,
              material: Cesium.Color.YELLOW.withAlpha(0.4),
              outline: true,
              outlineColor: Cesium.Color.YELLOW,
              height: 0,
            },
          });
        }
      });
    } else if (type === "Polygon") {
      const hierarchy = createHierarchy(coords);
      if (hierarchy) {
        viewer.entities.add({
          name: name,
          polygon: {
            hierarchy: hierarchy,
            material: Cesium.Color.YELLOW.withAlpha(0.4),
            outline: true,
            outlineColor: Cesium.Color.YELLOW,
            height: 0,
          },
        });
      }
    }
  });

  // Modal-Elemente
  const modal = document.getElementById("countryModal");
  const closeModal = document.getElementById("closeModal");
  const countryNameElement = document.getElementById("countryName");
  const countryStatsElement = document.getElementById("countryStats");

  closeModal.onclick = () => {
    modal.style.display = "none";
  };

  window.onclick = (event) => {
    if (event.target === modal) {
      modal.style.display = "none";
    }
  };

  // Ländername-Fuzzy-Matching
  function findCountryStats(countryName) {
    const match = statsData.find((entry) => {
      return entry.Year === 2019 && entry.Entity &&
          entry.Entity.toLowerCase().trim() === countryName.toLowerCase().trim();
    });

    if (match) return match;

    // Fallback: enthält den Namen?
    return statsData.find((entry) => {
      return entry.Year === 2020 && entry.Entity &&
          (entry.Entity.toLowerCase().includes(countryName.toLowerCase()) ||
              countryName.toLowerCase().includes(entry.Entity.toLowerCase()));
    });
  }

  // Klick-Event-Handler
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  handler.setInputAction((movement) => {
    const pickedObject = viewer.scene.pick(movement.position);
    if (Cesium.defined(pickedObject) && pickedObject.id?.name) {
      const countryName = pickedObject.id.name;

      const countryStats = findCountryStats(countryName);

      if (countryStats) {
        const accessElectricity = countryStats["Access to electricity (% of population)"];
        const renewableShare = countryStats["Renewable energy share in the total final energy consumption (%)"];
        const co2Emissions = countryStats["Value_co2_emissions_kt_by_country"];

        const statsHTML = `
          <strong>Access to electricity:</strong> ${accessElectricity != null ? Number(accessElectricity).toFixed(2) : "N/A"}%<br>
          <strong>Renewable energy share:</strong> ${renewableShare != null ? Number(renewableShare).toFixed(2) : "N/A"}%<br>
          <strong>CO₂ emissions:</strong> ${co2Emissions != null ? Number(co2Emissions).toLocaleString(undefined, { maximumFractionDigits: 2 }) : "N/A"} kt
        `;

        countryNameElement.textContent = countryName;
        countryStatsElement.innerHTML = statsHTML;
        modal.style.display = "block";
      } else {
        countryNameElement.textContent = countryName;
        countryStatsElement.innerHTML = "No data available for 2019.";
        modal.style.display = "block";
      }
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
}

initializeGlobe();
