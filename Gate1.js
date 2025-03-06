/* --- Parameters --- */
// Baseline composite period for Jabbona (for example, using Feb 13–14)
var startDate = '2025-02-08';
var endDate   = '2025-02-13';

// Define target AOI for Jabbona
var targetAOI = Jabbona;  

// Define target CRS and scale (Sentinel-2 resolution)
var targetCRS = 'EPSG:32643'; // UTM Zone 43N
var scale = 10;               // 10m resolution

// Define threshold range for Jabbona (2024)
var threshold2024_Jabbona = { lower: 0.000003674, upper: 0.000006483 };

/* --- Load and Prepare Sentinel-2 Data --- */
// Load Sentinel-2 Surface Reflectance collection, filtering by date and AOI.
var sentinel2Collection = ee.ImageCollection("COPERNICUS/S2_SR")
  .filterDate(startDate, endDate)
  .filterBounds(targetAOI);
print("Sentinel-2 Data for Jabbona:", sentinel2Collection);

/* --- Define Helper Functions --- */
// Function to mask clouds, cirrus, snow, and cloud shadows using the SCL band.
function maskS2sr(image) {
  var scl = image.select('SCL');
  // Remove clouds (9) and snow (11); keep shadows (8) if desired.
  var cloudMask = scl.neq(9).and(scl.neq(11));
  return image.updateMask(cloudMask);
}

// Function to add NDVI band using NIR and Red bands.
function addNDVI(image, nirBand, redBand) {
  nirBand = (nirBand === undefined) ? 'B8' : nirBand;
  redBand = (redBand === undefined) ? 'B4' : redBand;
  var ndvi = image.normalizedDifference([nirBand, redBand]).rename('NDVI');
  return image.addBands(ndvi);
}

/* --- Process Sentinel-2 Collection for NDVI --- */
var sentinel2NDVI = sentinel2Collection
  // .map(maskS2sr) // Uncomment if you wish to mask clouds.
  .map(function(img) {
    var scaled = img.divide(10000);
    return addNDVI(scaled).copyProperties(img, img.propertyNames());
  })
  .select('NDVI')
  .map(function(img) {
    return img.clip(targetAOI); // Clip each image to the target AOI.
  });
print("Sentinel-2 NDVI Collection for Jabbona:", sentinel2NDVI);
Map.addLayer(sentinel2NDVI, {}, 'NDVI');

/* --- Process the Reference Image for 2024 Data (Jabbona) --- */
print('Original Projection (Jabbona 2024):', NBSI_SUGARCANE_2024_jabbona.projection());
var minMaxValues = NBSI_SUGARCANE_2024_jabbona.reduceRegion({
  reducer: ee.Reducer.minMax(),
  geometry: targetAOI,
  scale: scale,
  maxPixels: 1e13
});
print('Min and Max Values (Jabbona 2024):', minMaxValues);

// Reproject the reference image to the target CRS.
var reprojected2024_Jabbona = NBSI_SUGARCANE_2024_jabbona.reproject({
  crs: targetCRS,
  scale: scale
});

/* --- Apply Threshold Mask to the Reprojected Image (Jabbona) --- */
var masked2024_Jabbona = reprojected2024_Jabbona.updateMask(
  reprojected2024_Jabbona.gte(threshold2024_Jabbona.lower)
    .and(reprojected2024_Jabbona.lte(threshold2024_Jabbona.upper))
);
Map.addLayer(masked2024_Jabbona, { 
  min: threshold2024_Jabbona.lower, 
  max: threshold2024_Jabbona.upper, 
  palette: ['green'] 
}, 'Masked Image (Jabbona 2024)');

/* --- Compute Pixel Count and Area for the Masked Reference Image --- */
var pixelCount2024_Jabbona = masked2024_Jabbona.reduceRegion({
  reducer: ee.Reducer.count(),
  geometry: targetAOI,
  scale: scale,
  maxPixels: 1e13
});
print('Pixel Count (Jabbona 2024):', pixelCount2024_Jabbona);
var pixelAreaM2 = scale * scale; // 10m x 10m = 100 m²
var areaM2_2024_Jabbona = ee.Number(pixelCount2024_Jabbona.get('b1')).multiply(pixelAreaM2);
var areaAcres_2024_Jabbona = areaM2_2024_Jabbona.divide(4046.8564224);
print('Computed Area (m²) (Jabbona 2024):', areaM2_2024_Jabbona);
print('Computed Area (acres) (Jabbona 2024):', areaAcres_2024_Jabbona);

/* --- Apply the Threshold Mask to the NDVI Collection (Jabbona) --- */
// Use the mask from the reference image.
var gateThresholdMask_Jabbona = masked2024_Jabbona.mask();
var ndviMaskedCollection_Jabbona = sentinel2NDVI.map(function(image) {
  return image.updateMask(gateThresholdMask_Jabbona);
});
var ndviComposite_Jabbona = ndviMaskedCollection_Jabbona.median();
var ndviVis = {
  min: 0,
  max: 1,
  palette: ['blue', 'white', 'green']
};
Map.addLayer(ndviComposite_Jabbona, ndviVis, "NDVI (Jabbona Threshold Mask)");
print("NDVI with Jabbona Threshold Mask:", ndviComposite_Jabbona);

/* --- Further Threshold NDVI (NDVI >= .3) for Jabbona --- */
var ndviThresholded_Jabbona = ndviComposite_Jabbona.updateMask(ndviComposite_Jabbona.gte(.3));
Map.addLayer(ndviThresholded_Jabbona, ndviVis, "NDVI (Jabbona Mask, NDVI >= .3)");
print("NDVI with Jabbona Threshold and NDVI >= .3:", ndviThresholded_Jabbona);
var ndviPixelCount_Jabbona = ndviThresholded_Jabbona.reduceRegion({
  reducer: ee.Reducer.count(),
  geometry: targetAOI,
  scale: scale,
  maxPixels: 1e13
});
print("Pixel Count for NDVI (>= .3) for Jabbona:", ndviPixelCount_Jabbona);
var areaM2NDVI_Jabbona = ee.Number(ndviPixelCount_Jabbona.get('NDVI')).multiply(pixelAreaM2);
var areaAcresNDVI_Jabbona = areaM2NDVI_Jabbona.divide(4046.8564224);
print("Computed Area (m²) for NDVI (>= .3) (Jabbona):", areaM2NDVI_Jabbona);
print("Computed Area (acres) for NDVI (>= .3) (Jabbona):", areaAcresNDVI_Jabbona);

/* --- New Block: Process February 14 Imagery for Jabbona --- */
// Define dates for the Feb 14 imagery block.
var feb13Date = '2025-02-13';
var feb14Date = '2025-02-14';

// Load Sentinel-2 imagery specifically for Feb 14.
var sentinel2Feb14 = ee.ImageCollection("COPERNICUS/S2_SR")
  .filterDate(feb13Date, feb14Date)
  .filterBounds(targetAOI)
  .map(function(img) {
    var scaled = img.divide(10000);
    return addNDVI(scaled).copyProperties(img, img.propertyNames());
  })
  .select('NDVI')
  .map(function(img) {
    return img.clip(targetAOI);
  });

// Create a composite (or select the appropriate image) for Feb 14.
var ndviFeb14 = sentinel2Feb14.median();

// Apply the NDVI threshold for Feb 14 (NDVI >= .3).
var ndviFeb14Thresholded = ndviFeb14.updateMask(ndviFeb14.gte(.3));

// Restrict analysis to the area defined by the baseline NDVI threshold mask.
var feb14Masked = ndviFeb14Thresholded.updateMask(ndviThresholded_Jabbona.mask());
Map.addLayer(feb14Masked, {min: .3, max: 1, palette: ['yellow']}, 'NDVI (Jabbona Feb 14, NDVI>=.3)');

// Compute area for Feb 14 thresholded pixels.
var pixelCountFeb14 = feb14Masked.reduceRegion({
  reducer: ee.Reducer.count(),
  geometry: targetAOI,
  scale: scale,
  maxPixels: 1e13
});
var areaM2Feb14 = ee.Number(pixelCountFeb14.get('NDVI')).multiply(pixelAreaM2);
var areaAcresFeb14 = areaM2Feb14.divide(4046.8564224);
print("Computed Area (m²) for NDVI (>= .3) Feb 14 (Jabbona):", areaM2Feb14);
print("Computed Area (acres) for NDVI (>= .3) Feb 14 (Jabbona):", areaAcresFeb14);
