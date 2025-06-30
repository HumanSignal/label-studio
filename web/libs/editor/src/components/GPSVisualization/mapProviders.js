// web/libs/editor/src/components/GPSVisualization/mapProviders.js
export const MAP_PROVIDERS = {
  Custom: {
    name: "Custom",
    url: "",
    options: {
      maxZoom: 19,
      attribution: "",
      apiKeyRequired: false,
    },
  },
  OpenStreetMap: {
    name: "OpenStreetMap",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    options: {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      apiKeyRequired: false,
    },
  },
  Esri_WorldImagery: {
    name: "Esri World Imagery",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    options: {
      maxZoom: 19, // Esri maxZoom can vary, 19 is common
      attribution:
        "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
      apiKeyRequired: false,
    },
  },
  Thunderforest_Cycle: {
    name: "Thunderforest Cycle",
    url: "https://{s}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png?apikey={apiKey}",
    options: {
      maxZoom: 22,
      attribution:
        '&copy; <a href="http://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      apiKeyRequired: true,
      apiKeyName: "Thunderforest API Key", // Name for the input label
    },
  },
  // --- Add OSM Variants ---
  OpenStreetMap_DE: {
    name: "OpenStreetMap DE",
    url: "https://tile.openstreetmap.de/{z}/{x}/{y}.png",
    options: {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      apiKeyRequired: false,
    },
  },
  OpenStreetMap_France: {
    name: "OpenStreetMap France",
    url: "https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png",
    options: {
      maxZoom: 20,
      attribution:
        '&copy; OpenStreetMap France | &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      apiKeyRequired: false,
      subdomains: "abc", // Default subdomains for {s}
    },
  },
  OpenStreetMap_HOT: {
    name: "OpenStreetMap HOT",
    url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
    options: {
      maxZoom: 19, // Default maxZoom
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/">Humanitarian OpenStreetMap Team</a> hosted by <a href="https://openstreetmap.fr/">OpenStreetMap France</a>',
      apiKeyRequired: false,
      subdomains: "abc",
    },
  },
  // --- Add More Thunderforest Variants ---
  Thunderforest_Transport: {
    name: "Thunderforest Transport",
    url: "https://{s}.tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey={apiKey}",
    options: {
      maxZoom: 22,
      attribution:
        '&copy; <a href="http://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      apiKeyRequired: true,
      apiKeyName: "Thunderforest API Key",
    },
  },
  Thunderforest_Outdoors: {
    name: "Thunderforest Outdoors",
    url: "https://{s}.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey={apiKey}",
    options: {
      maxZoom: 22,
      attribution:
        '&copy; <a href="http://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      apiKeyRequired: true,
      apiKeyName: "Thunderforest API Key",
    },
  },
  // --- Add CartoDB/CARTO providers ---
  CartoDB_Positron: {
    name: "CARTO Positron",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    options: {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 20,
      apiKeyRequired: false,
    },
  },
  CartoDB_DarkMatter: {
    name: "CARTO Dark Matter",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    options: {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 20,
      apiKeyRequired: false,
    },
  },
  CartoDB_Voyager: {
    name: "CARTO Voyager",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    options: {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 20,
      apiKeyRequired: false,
    },
  },
  // --- Add Jawg Maps providers ---
  Jawg_Streets: {
    name: "Jawg Streets",
    url: "https://{s}.tile.jawg.io/jawg-streets/{z}/{x}/{y}{r}.png?access-token={accessToken}",
    options: {
      attribution:
        '<a href="http://jawg.io" title="Tiles Courtesy of Jawg Maps" target="_blank">&copy; JawgMaps</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      minZoom: 0,
      maxZoom: 22,
      subdomains: "abcd",
      apiKeyRequired: true,
      apiKeyName: "Jawg Access Token",
      apiKeyPlaceholder: "accessToken",
    },
  },
  Jawg_Dark: {
    name: "Jawg Dark",
    url: "https://{s}.tile.jawg.io/jawg-dark/{z}/{x}/{y}{r}.png?access-token={accessToken}",
    options: {
      attribution:
        '<a href="http://jawg.io" title="Tiles Courtesy of Jawg Maps" target="_blank">&copy; JawgMaps</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      minZoom: 0,
      maxZoom: 22,
      subdomains: "abcd",
      apiKeyRequired: true,
      apiKeyName: "Jawg Access Token",
      apiKeyPlaceholder: "accessToken",
    },
  },
  Jawg_Terrain: {
    name: "Jawg Terrain",
    url: "https://{s}.tile.jawg.io/jawg-terrain/{z}/{x}/{y}{r}.png?access-token={accessToken}",
    options: {
      attribution:
        '<a href="http://jawg.io" title="Tiles Courtesy of Jawg Maps" target="_blank">&copy; JawgMaps</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      minZoom: 0,
      maxZoom: 22,
      subdomains: "abcd",
      apiKeyRequired: true,
      apiKeyName: "Jawg Access Token",
      apiKeyPlaceholder: "accessToken",
    },
  },
  Jawg_Sunny: {
    name: "Jawg Sunny",
    url: "https://{s}.tile.jawg.io/jawg-sunny/{z}/{x}/{y}{r}.png?access-token={accessToken}",
    options: {
      attribution:
        '<a href="http://jawg.io" title="Tiles Courtesy of Jawg Maps" target="_blank">&copy; JawgMaps</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      minZoom: 0,
      maxZoom: 22,
      subdomains: "abcd",
      apiKeyRequired: true,
      apiKeyName: "Jawg Access Token",
      apiKeyPlaceholder: "accessToken",
    },
  },
  Jawg_Matrix: {
    name: "Jawg Matrix",
    url: "https://{s}.tile.jawg.io/jawg-matrix/{z}/{x}/{y}{r}.png?access-token={accessToken}",
    options: {
      attribution:
        '<a href="http://jawg.io" title="Tiles Courtesy of Jawg Maps" target="_blank">&copy; JawgMaps</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      minZoom: 0,
      maxZoom: 22,
      subdomains: "abcd",
      apiKeyRequired: true,
      apiKeyName: "Jawg Access Token",
      apiKeyPlaceholder: "accessToken",
    },
  },
  // --- Add MapTiler providers ---
  MapTiler_Streets: {
    name: "MapTiler Streets",
    url: "https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key={apiKey}",
    options: {
      attribution:
        '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>',
      apiKeyRequired: true,
      apiKeyName: "MapTiler API Key",
      maxZoom: 22,
    },
  },
  MapTiler_Basic: {
    name: "MapTiler Basic",
    url: "https://api.maptiler.com/maps/basic-v2/{z}/{x}/{y}.png?key={apiKey}",
    options: {
      attribution:
        '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>',
      apiKeyRequired: true,
      apiKeyName: "MapTiler API Key",
      maxZoom: 22,
    },
  },
  MapTiler_Bright: {
    name: "MapTiler Bright",
    url: "https://api.maptiler.com/maps/bright-v2/{z}/{x}/{y}.png?key={apiKey}",
    options: {
      attribution:
        '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>',
      apiKeyRequired: true,
      apiKeyName: "MapTiler API Key",
      maxZoom: 22,
    },
  },
  MapTiler_Dataviz: {
    name: "MapTiler Dataviz",
    url: "https://api.maptiler.com/maps/dataviz/{z}/{x}/{y}.png?key={apiKey}",
    options: {
      attribution:
        '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>',
      apiKeyRequired: true,
      apiKeyName: "MapTiler API Key",
      maxZoom: 22,
    },
  },
  MapTiler_Satellite: {
    name: "MapTiler Satellite",
    url: "https://api.maptiler.com/maps/satellite/{z}/{x}/{y}.jpg?key={apiKey}",
    options: {
      attribution:
        '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>',
      apiKeyRequired: true,
      apiKeyName: "MapTiler API Key",
      maxZoom: 20,
    },
  },
  MapTiler_Hybrid: {
    name: "MapTiler Hybrid",
    url: "https://api.maptiler.com/maps/hybrid/{z}/{x}/{y}.png?key={apiKey}",
    options: {
      attribution:
        '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>',
      apiKeyRequired: true,
      apiKeyName: "MapTiler API Key",
      maxZoom: 20,
    },
  },
  MapTiler_Ocean: {
    name: "MapTiler Ocean",
    url: "https://api.maptiler.com/maps/ocean/{z}/{x}/{y}.png?key={apiKey}",
    options: {
      attribution:
        '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>',
      apiKeyRequired: true,
      apiKeyName: "MapTiler API Key",
      maxZoom: 22,
    },
  },
  MapTiler_Winter: {
    name: "MapTiler Winter",
    url: "https://api.maptiler.com/maps/winter-v2/{z}/{x}/{y}.png?key={apiKey}",
    options: {
      attribution:
        '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>',
      apiKeyRequired: true,
      apiKeyName: "MapTiler API Key",
      maxZoom: 22,
    },
  },
  // --- Add Mapbox providers ---
  Mapbox_Streets: {
    name: "Mapbox Streets",
    url: "https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}{r}?access_token={accessToken}",
    options: {
      attribution:
        '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors <a href="https://www.mapbox.com/map-feedback/" target="_blank">Improve this map</a>',
      tileSize: 512,
      zoomOffset: -1,
      id: "mapbox/streets-v11", // Default style
      apiKeyRequired: true,
      apiKeyName: "Mapbox Access Token",
      apiKeyPlaceholder: "accessToken",
      maxZoom: 22, // Usually 22 for Mapbox styles
    },
  },
  Mapbox_Outdoors: {
    name: "Mapbox Outdoors",
    url: "https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}{r}?access_token={accessToken}",
    options: {
      attribution:
        '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors <a href="https://www.mapbox.com/map-feedback/" target="_blank">Improve this map</a>',
      tileSize: 512,
      zoomOffset: -1,
      id: "mapbox/outdoors-v11",
      apiKeyRequired: true,
      apiKeyName: "Mapbox Access Token",
      apiKeyPlaceholder: "accessToken",
      maxZoom: 22,
    },
  },
  Mapbox_Light: {
    name: "Mapbox Light",
    url: "https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}{r}?access_token={accessToken}",
    options: {
      attribution:
        '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors <a href="https://www.mapbox.com/map-feedback/" target="_blank">Improve this map</a>',
      tileSize: 512,
      zoomOffset: -1,
      id: "mapbox/light-v10",
      apiKeyRequired: true,
      apiKeyName: "Mapbox Access Token",
      apiKeyPlaceholder: "accessToken",
      maxZoom: 22,
    },
  },
  Mapbox_Dark: {
    name: "Mapbox Dark",
    url: "https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}{r}?access_token={accessToken}",
    options: {
      attribution:
        '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors <a href="https://www.mapbox.com/map-feedback/" target="_blank">Improve this map</a>',
      tileSize: 512,
      zoomOffset: -1,
      id: "mapbox/dark-v10",
      apiKeyRequired: true,
      apiKeyName: "Mapbox Access Token",
      apiKeyPlaceholder: "accessToken",
      maxZoom: 22,
    },
  },
  Mapbox_Satellite: {
    name: "Mapbox Satellite",
    url: "https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}{r}?access_token={accessToken}",
    options: {
      attribution:
        '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors <a href="https://www.mapbox.com/map-feedback/" target="_blank">Improve this map</a>',
      tileSize: 512,
      zoomOffset: -1,
      id: "mapbox/satellite-v9",
      apiKeyRequired: true,
      apiKeyName: "Mapbox Access Token",
      apiKeyPlaceholder: "accessToken",
      maxZoom: 22,
    },
  },
  Mapbox_SatelliteStreets: {
    name: "Mapbox Satellite Streets",
    url: "https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}{r}?access_token={accessToken}",
    options: {
      attribution:
        '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors <a href="https://www.mapbox.com/map-feedback/" target="_blank">Improve this map</a>',
      tileSize: 512,
      zoomOffset: -1,
      id: "mapbox/satellite-streets-v11",
      apiKeyRequired: true,
      apiKeyName: "Mapbox Access Token",
      apiKeyPlaceholder: "accessToken",
      maxZoom: 22,
    },
  },
  // --- Add NLS providers ---
  NLS: {
    name: "National Library of Scotland (UK Historic)",
    url: "https://api.maptiler.com/tiles/uk-osgb1919/{z}/{x}/{y}.jpg?key={apiKey}", // Example: 1919 variant
    options: {
      attribution: "National Library of Scotland Historic Maps",
      bounds: [
        [49.6, -12],
        [61.7, 3],
      ],
      minZoom: 1,
      maxZoom: 18,
      apiKeyRequired: true,
      apiKeyName: "MapTiler API Key (for NLS)",
    },
  },
};

export const DEFAULT_PROVIDER = "OpenStreetMap";

// --- Export Defaults ---
export const DEFAULT_TILE_URL = MAP_PROVIDERS[DEFAULT_PROVIDER].url;
export const DEFAULT_TILE_ATTRIBUTION = MAP_PROVIDERS[DEFAULT_PROVIDER].options.attribution;
export const DEFAULT_TILE_MAX_ZOOM = MAP_PROVIDERS[DEFAULT_PROVIDER].options.maxZoom;

export function getProvider(providerName = DEFAULT_PROVIDER) {
  return MAP_PROVIDERS[providerName] || MAP_PROVIDERS[DEFAULT_PROVIDER];
}
