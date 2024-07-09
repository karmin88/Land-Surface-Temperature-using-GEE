// Define the region of interest (Perak)
var roi = ee.FeatureCollection('FAO/GAUL/2015/level1')
    .filter(ee.Filter.eq('ADM1_NAME', 'Perak'));

// Import MODIS Land Surface Temperature (LST) data
var collection = ee.ImageCollection('MODIS/061/MOD11A2').select("LST_Day_1km")
  .filterDate('2019-01-01', '2023-12-31')
  .filterBounds(roi);

// Preprocessing: Convert from Kelvin to Celsius
var LSTDay = collection.map(function(img) {
  return img.multiply(0.02).subtract(273.15).copyProperties(img, ['system:time_start', 'system:time_end']);
});

// Displaying Annual LST Variation
var chart = ui.Chart.image.doySeriesByYear(
  LSTDay, 'LST_Day_1km', roi, ee.Reducer.mean(), 1000)
  .setOptions({
    title: 'Annual Variation of Land Surface Temperature (LST) in Perak (2019-2023)',
    vAxis: {title: 'Temperature (Celsius)'},
    hAxis: {title: 'Day of Year'}
  });
print(chart);

// Visualize the LST data
var landSurfaceTemperatureVis = {
  min: 20.0,
  max: 40.0,
  palette: [
    '040274', '040281', '0502a3', '0502b8', '0502ce', '0502e6',
    '0602ff', '235cb1', '307ef3', '269db1', '30c8e2', '32d3ef',
    '3be285', '3ff38f', '86e26f', '3ae237', 'b5e22e', 'd6e21f',
    'fff705', 'ffd611', 'ffb613', 'ff8b13', 'ff6e08', 'ff500d',
    'ff0000', 'de0101', 'c21301', 'a71001', '911003'
  ]
};

Map.setCenter(101.0901, 4.5921, 8); // Center the map on Perak
Map.addLayer(LSTDay.mean().clip(roi), landSurfaceTemperatureVis, 'Mean LST (2019-2023)');

// Generate and display the timeseries chart
var chart = ui.Chart.image.series({
  imageCollection: LSTDay,
  region: roi,
  reducer: ee.Reducer.mean(),
  scale: 1000,
  xProperty: 'system:time_start'
}).setOptions({
  title: 'Mean LST Over Time (2019-2023)',
  vAxis: {title: 'Temperature (Celsius)'},
  hAxis: {title: 'Date'},
  lineWidth: 1,
  pointSize: 3
});
print(chart);
