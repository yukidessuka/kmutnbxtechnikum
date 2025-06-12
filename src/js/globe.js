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

  // GeoJSON laden, aber nur als normales JSON, nicht über Cesium.GeoJsonDataSource
  const response = await fetch(
      "https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json"
  );
  const geojson = await response.json();

  // Für jedes Feature manuell Entities mit Polygon hinzufügen
  geojson.features.forEach((feature) => {
    const coords = feature.geometry.coordinates;
    const type = feature.geometry.type;
    const name =
        feature.properties.name || feature.properties.ADMIN || feature.properties.NAME || "Unbekannt";

    // Funktion zum Erzeugen einer Cesium Hierarchy aus GeoJSON-Koordinaten
    function createHierarchy(coords) {
      // Ein Polygon: coords ist Array von [ [lng, lat], ...]
      // Ein MultiPolygon: coords ist Array von Polygonen
      if (!coords || coords.length === 0) return null;

      if (typeof coords[0][0] === "number") {
        // Polygon
        const positions = coords.map((pos) =>
            Cesium.Cartesian3.fromDegrees(pos[0], pos[1])
        );
        return new Cesium.PolygonHierarchy(positions);
      } else {
        // MultiPolygon
        // Wir brauchen nur den äußeren Ring des ersten Polygons (vereinfachte Version)
        // Für volle MultiPolygon-Unterstützung müssten wir komplexer sein
        return createHierarchy(coords[0]);
      }
    }

    let hierarchy = null;

    if (type === "Polygon") {
      hierarchy = createHierarchy(coords);
    } else if (type === "MultiPolygon") {
      // Für MultiPolygons fügen wir je ein Entity pro Polygon hinzu
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
      return; // Für MultiPolygon hier fertig
    }

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
  });

  // Klick-Handler
  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  handler.setInputAction((movement) => {
    const pickedObject = viewer.scene.pick(movement.position);
    if (Cesium.defined(pickedObject) && pickedObject.id?.name) {
      alert("Angeklicktes Land: " + pickedObject.id.name);
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
}

initializeGlobe();
