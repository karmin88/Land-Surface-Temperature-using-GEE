// Define the ROI (Region of Interest)
var roi = ee.FeatureCollection('FAO/GAUL/2015/level1')
            .filter(ee.Filter.eq('ADM1_NAME', 'Perak'));

// Add the ROI to the Map and Set the Map View
Map.addLayer(roi, {}, 'ROI - Perak');
Map.centerObject(roi, 10);

// Function to Apply Scaling Factors
function applyScaleFactors(image) {
  var opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2);
  var thermalBands = image.select('ST_B.*').multiply(0.00341802).add(149.0);
  return image.addBands(opticalBands, null, true)
              .addBands(thermalBands, null, true);
}

// Function to Mask Clouds and Cloud Shadows
function cloudMask(image) {
  var cloudShadowBitmask = (1 << 3);
  var cloudBitmask = (1 << 5);
  var qa = image.select('QA_PIXEL');
  var mask = qa.bitwiseAnd(cloudShadowBitmask).eq(0)
                .and(qa.bitwiseAnd(cloudBitmask).eq(0));
  return image.updateMask(mask);
}

// Define a Function to Calculate LST for a Given Year
function calculateLST(year) {
  var startDate = ee.Date.fromYMD(year, 6, 1);
  var endDate = ee.Date.fromYMD(year, 9, 21);
  
  var image = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")
                .filterBounds(roi)
                .filterDate(startDate, endDate)
                .map(applyScaleFactors)
                .map(cloudMask)
                .median()
                .clip(roi);
  
  var ndvi = image.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI');
  
  var ndviMin = ee.Number(ndvi.reduceRegion({
    reducer: ee.Reducer.min(),
    geometry: roi,
    scale: 30,
    maxPixels: 1e9
  }).values().get(0));
  
  var ndviMax = ee.Number(ndvi.reduceRegion({
    reducer: ee.Reducer.max(),
    geometry: roi,
    scale: 30,
    maxPixels: 1e9
  }).values().get(0));
  
  var pv = ((ndvi.subtract(ndviMin)).divide(ndviMax.subtract(ndviMin)))
            .pow(ee.Number(2))
            .rename('PV');
  
  var em = pv.multiply(ee.Number(0.004)).add(ee.Number(0.986)).rename('EM');
  
  var thermal = image.select('ST_B10').rename('thermal');
  
  var lst = thermal.expression(
    '(TB / (1 + (0.00115 * (TB / 1.438)) * log(em))) - 273.15', {
      'TB': thermal.select('thermal'),
      'em': em
    }).rename('LST Perak ' + year);
  
  var visualization = {
    bands: ['SR_B4', 'SR_B3', 'SR_B2'],
    min: 0.0,
    max: 0.15
  };
  
  Map.addLayer(image, visualization, 'True Color 432 - ' + year);
  
  var ndviPalette = {
    min: -1,
    max: 1,
    palette: ['blue', 'white', 'green']
  };
  
  Map.addLayer(ndvi, ndviPalette, 'NDVI Perak - ' + year);
  
  Map.addLayer(lst, {
    min: 15,
    max: 45,
    palette: [
      '040274', '040281', '0502a3', '0502b8', '0502ce', '0502e6',
      '0602ff', '235cb1', '307ef3', '269db1', '30c8e2', '32d3ef',
      '3be285', '3ff38f', '86e26f', '3ae237', 'b5e22e', 'd6e21f',
      'fff705', 'ffd611', 'ffb613', 'ff8b13', 'ff6e08', 'ff500d',
      'ff0000', 'de0101', 'c21301', 'a71001', '911003'
    ]}, 'Land Surface Temperature - ' + year);
}

// Calculate and Visualize LST for the Years 2019, 2020, 2021, 2022, and 2023
var years = [2019, 2020, 2021, 2022, 2023];
years.forEach(function(year) {
  calculateLST(year);
});

// Create a Legend for Land Surface Temperature (LST) Visualization
var minLST = 15;
var maxLST = 45;

var legend = ui.Panel({
  style: {
    position: 'bottom-right',
    padding: '8px 15px',
    backgroundColor: 'white'
  }
});

var legendTitle = ui.Label({
  value: 'Land Surface Temperature (°C)',
  style: {
    fontWeight: 'bold',
    fontSize: '16px', // Adjusted font size
    margin: '0 0 4px 0',
    padding: '0'
  }
});

legend.add(legendTitle);

var palette = [
  '040274', '040281', '0502a3', '0502b8', '0502ce', '0502e6',
  '0602ff', '235cb1', '307ef3', '269db1', '30c8e2', '32d3ef',
  '3be285', '3ff38f', '86e26f', '3ae237', 'b5e22e', 'd6e21f',
  'fff705', 'ffd611', 'ffb613', 'ff8b13', 'ff6e08', 'ff500d',
  'ff0000', 'de0101', 'c21301', 'a71001', '911003', '210300'
];

var step = (maxLST - minLST) / (palette.length - 1);

for (var i = 0; i < palette.length; i++) {
  var colorBox = ui.Label({
    style: {
      backgroundColor: '#' + palette[i],
      padding: '5px', // Adjusted padding
      margin: '0 0 5px 0', // Adjusted margin
      width: '30px' // Adjusted width
    }
  });

  var legendLabel = ui.Label({
    value: (minLST + i * step).toFixed(2),
    style: {
      fontSize: '10px', // Adjusted font size
      margin: '0 0 5px 6px' // Adjusted margin
    }
  });

  var legendPanel = ui.Panel({
    widgets: [colorBox, legendLabel],
    layout: ui.Panel.Layout.Flow('horizontal')
  });

  legend.add(legendPanel);
}

Map.add(legend);

// Create a Map Title
var mapTitle = ui.Panel({
  style: {
    position: 'top-center',
    padding: '20px 20px'
  }
});
var mapTitle2 = ui.Label({
  value: 'Land Surface Temperature - Perak',
  style: {
    fontWeight: 'bold',
    fontSize: '20px', // Adjusted font size
    margin: '8px 8px 8px 8px',
    padding: '0'
  }
});
mapTitle.add(mapTitle2);

Map.add(mapTitle);
