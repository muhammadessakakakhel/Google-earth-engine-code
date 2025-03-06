// // // /* --- Parameters --- */
// // Baseline composite period for Jabbona (for example, using Feb 13–14)
// var startDate = '2025-02-08';
// var endDate   = '2025-02-13';

// // Define target AOI for Jabbona
// var targetAOI = Jabbona;  

// // Define target CRS and scale (Sentinel-2 resolution)
// var targetCRS = 'EPSG:32643'; // UTM Zone 43N
// var scale = 10;               // 10m resolution

// // Define threshold range for Jabbona (2024)
// var threshold2024_Jabbona = { lower: 0.000003674, upper: 0.000006483 };

// /* --- Load and Prepare Sentinel-2 Data --- */
// // Load Sentinel-2 Surface Reflectance collection, filtering by date and AOI.
// var sentinel2Collection = ee.ImageCollection("COPERNICUS/S2_SR")
//   .filterDate(startDate, endDate)
//   .filterBounds(targetAOI);
// print("Sentinel-2 Data for Jabbona:", sentinel2Collection);

// /* --- Define Helper Functions --- */
// // Function to mask clouds, cirrus, snow, and cloud shadows using the SCL band.
// function maskS2sr(image) {
//   var scl = image.select('SCL');
//   // Remove clouds (9) and snow (11); keep shadows (8) if desired.
//   var cloudMask = scl.neq(9).and(scl.neq(11));
//   return image.updateMask(cloudMask);
// }

// // Function to add NDVI band using NIR and Red bands.
// function addNDVI(image, nirBand, redBand) {
//   nirBand = (nirBand === undefined) ? 'B8' : nirBand;
//   redBand = (redBand === undefined) ? 'B4' : redBand;
//   var ndvi = image.normalizedDifference([nirBand, redBand]).rename('NDVI');
//   return image.addBands(ndvi);
// }

// /* --- Process Sentinel-2 Collection for NDVI --- */
// var sentinel2NDVI = sentinel2Collection
//   .map(maskS2sr) // Uncomment if you wish to mask clouds.
//   .map(function(img) {
//     var scaled = img.divide(10000);
//     return addNDVI(scaled).copyProperties(img, img.propertyNames());
//   })
//   .select('NDVI')
//   .map(function(img) {
//     return img.clip(targetAOI); // Clip each image to the target AOI.
//   });
// print("Sentinel-2 NDVI Collection for Jabbona:", sentinel2NDVI);
// Map.addLayer(sentinel2NDVI, {}, 'NDVI');

// /* --- Process the Reference Image for 2024 Data (Jabbona) --- */
// print('Original Projection (Jabbona 2024):', NBSI_SUGARCANE_2024_jabbona.projection());
// var minMaxValues = NBSI_SUGARCANE_2024_jabbona.reduceRegion({
//   reducer: ee.Reducer.minMax(),
//   geometry: targetAOI,
//   scale: scale,
//   maxPixels: 1e13
// });
// print('Min and Max Values (Jabbona 2024):', minMaxValues);

// // Reproject the reference image to the target CRS.
// var reprojected2024_Jabbona = NBSI_SUGARCANE_2024_jabbona.reproject({
//   crs: targetCRS,
//   scale: scale
// });

// /* --- Apply Threshold Mask to the Reprojected Image (Jabbona) --- */
// var masked2024_Jabbona = reprojected2024_Jabbona.updateMask(
//   reprojected2024_Jabbona.gte(threshold2024_Jabbona.lower)
//     .and(reprojected2024_Jabbona.lte(threshold2024_Jabbona.upper))
// );
// Map.addLayer(masked2024_Jabbona, { 
//   min: threshold2024_Jabbona.lower, 
//   max: threshold2024_Jabbona.upper, 
//   palette: ['green'] 
// }, 'Masked Image (Jabbona 2024)');

// /* --- Compute Pixel Count and Area for the Masked Reference Image --- */
// var pixelCount2024_Jabbona = masked2024_Jabbona.reduceRegion({
//   reducer: ee.Reducer.count(),
//   geometry: targetAOI,
//   scale: scale,
//   maxPixels: 1e13
// });
// print('Pixel Count (Jabbona 2024):', pixelCount2024_Jabbona);
// var pixelAreaM2 = scale * scale; // 10m x 10m = 100 m²
// var areaM2_2024_Jabbona = ee.Number(pixelCount2024_Jabbona.get('b1')).multiply(pixelAreaM2);
// var areaAcres_2024_Jabbona = areaM2_2024_Jabbona.divide(4046.8564224);
// print('Computed Area (m²) (Jabbona 2024):', areaM2_2024_Jabbona);
// print('Computed Area (acres) (Jabbona 2024):', areaAcres_2024_Jabbona);

// /* --- Apply the Threshold Mask to the NDVI Collection (Jabbona) --- */
// // Use the mask from the reference image.
// var gateThresholdMask_Jabbona = masked2024_Jabbona.mask();
// var ndviMaskedCollection_Jabbona = sentinel2NDVI.map(function(image) {
//   return image.updateMask(gateThresholdMask_Jabbona);
// });
// var ndviComposite_Jabbona = ndviMaskedCollection_Jabbona.median();
// var ndviVis = {
//   min: 0,
//   max: 1,
//   palette: ['blue', 'white', 'green']
// };
// Map.addLayer(ndviComposite_Jabbona, ndviVis, "NDVI (Jabbona Threshold Mask)");
// print("NDVI with Jabbona Threshold Mask:", ndviComposite_Jabbona);

// /* --- Further Threshold NDVI (NDVI >= .3) for Jabbona --- */
// var ndviThresholded_Jabbona = ndviComposite_Jabbona.updateMask(ndviComposite_Jabbona.gte(.3));
// Map.addLayer(ndviThresholded_Jabbona, ndviVis, "NDVI (Jabbona Mask, NDVI >= .3)");
// print("NDVI with Jabbona Threshold and NDVI >= .3:", ndviThresholded_Jabbona);
// var ndviPixelCount_Jabbona = ndviThresholded_Jabbona.reduceRegion({
//   reducer: ee.Reducer.count(),
//   geometry: targetAOI,
//   scale: scale,
//   maxPixels: 1e13
// });
// print("Pixel Count for NDVI (>= .3) for Jabbona:", ndviPixelCount_Jabbona);
// var areaM2NDVI_Jabbona = ee.Number(ndviPixelCount_Jabbona.get('NDVI')).multiply(pixelAreaM2);
// var areaAcresNDVI_Jabbona = areaM2NDVI_Jabbona.divide(4046.8564224);
// print("Computed Area (m²) for NDVI (>= .3) (Jabbona):", areaM2NDVI_Jabbona);
// print("Computed Area (acres) for NDVI (>= .3) (Jabbona):", areaAcresNDVI_Jabbona);

// /* --- New Block: Process February 14 Imagery for Jabbona --- */
// // Define dates for the Feb 14 imagery block.
// var feb13Date = '2025-02-13';
// var feb14Date = '2025-02-14';

// // Load Sentinel-2 imagery specifically for Feb 14.
// var sentinel2Feb14 = ee.ImageCollection("COPERNICUS/S2_SR")
//   .filterDate(feb13Date, feb14Date)
//   .filterBounds(targetAOI)
//   .map(function(img) {
//     var scaled = img.divide(10000);
//     return addNDVI(scaled).copyProperties(img, img.propertyNames());
//   })
//   .select('NDVI')
//   .map(function(img) {
//     return img.clip(targetAOI);
//   });

// // Create a composite (or select the appropriate image) for Feb 14.
// var ndviFeb14 = sentinel2Feb14.median();

// Map.addLayer(ndviFeb14, '', "ndviFeb14");

// // Apply the NDVI threshold for Feb 14 (NDVI >= .3).
// var ndviFeb14Thresholded = ndviFeb14.updateMask(ndviFeb14.gte(.23));

// // Restrict analysis to the area defined by the baseline NDVI threshold mask.
// var feb14Masked = ndviFeb14Thresholded.updateMask(ndviThresholded_Jabbona.mask());
// Map.addLayer(feb14Masked, {min: .3, max: 1, palette: ['yellow']}, 'NDVI (Jabbona Feb 14, NDVI>=.3)');

// // Compute area for Feb 14 thresholded pixels.
// var pixelCountFeb14 = feb14Masked.reduceRegion({
//   reducer: ee.Reducer.count(),
//   geometry: targetAOI,
//   scale: scale,
//   maxPixels: 1e13
// });
// var areaM2Feb14 = ee.Number(pixelCountFeb14.get('NDVI')).multiply(pixelAreaM2);
// var areaAcresFeb14 = areaM2Feb14.divide(4046.8564224);
// print("Computed Area (m²) for NDVI (>= .3) Feb 14 (Jabbona):", areaM2Feb14);
// print("Computed Area (acres) for NDVI (>= .3) Feb 14 (Jabbona):", areaAcresFeb14);














//Rodu Sultan


// /* --- Parameters --- */
// // Date range for Sentinel-2
// var startDate = '2025-02-08';
// var endDate   = '2025-02-13';

// // Define target Area of Interest (AOI)
// // Set to Rodu_Sultan for processing the Rodu_Sultan area.
// var targetAOI = Rodu_Sultan;  

// // Define target CRS and scale (Sentinel-2 resolution)
// var targetCRS = 'EPSG:32643'; // UTM Zone 43N
// var scale = 10;               // 10m resolution

// /* --- Load and Prepare Sentinel-2 Data --- */
// // Load Sentinel-2 Surface Reflectance collection, filter by date and AOI.
// var sentinel2Collection = ee.ImageCollection("COPERNICUS/S2_SR")
//   .filterDate(startDate, endDate)
//   .filterBounds(targetAOI);
// print("Sentinel-2 Data (Rodu_Sultan):", sentinel2Collection);

// function addNDVI(image, nirBand, redBand) {
//   // Assign default values if parameters are undefined.
//   nirBand = (nirBand === undefined) ? 'B8' : nirBand;
//   redBand = (redBand === undefined) ? 'B4' : redBand;
  
//   var ndvi = image.normalizedDifference([nirBand, redBand]).rename('NDVI');
//   return image.addBands(ndvi);
// }

// /* --- Process Sentinel-2 Collection for NDVI --- */
// var sentinel2NDVI = sentinel2Collection
//   .map(function(img) {
//     // Scale the image (Sentinel-2 SR values are scaled by 10000)
//     var scaled = img.divide(10000);
//     // Compute NDVI and copy image properties
//     return addNDVI(scaled).copyProperties(img, img.propertyNames());
//   })
//   .select('NDVI');
// print("Sentinel-2 NDVI Collection (Rodu_Sultan):", sentinel2NDVI);

// /* --- Process a Reference Image for 2024 Data --- */
// // Reproject the reference image to the target CRS.
// var reprojected2024 = NBSI_SUGARCANE_2024_Rodu_Sultan.reproject({
//   crs: targetCRS,
//   scale: scale
// });

// /* --- Apply Threshold Mask to the Reprojected Image --- */
// // Define threshold range for Rodu_Sultan 2024 data.
// var threshold_2024_Rodu_Sultan = { lower: 0.000003475, upper: 0.000006459 };

// var masked2024 = reprojected2024.updateMask(
//   reprojected2024.gte(threshold_2024_Rodu_Sultan.lower)
//     .and(reprojected2024.lte(threshold_2024_Rodu_Sultan.upper))
// );
// Map.addLayer(masked2024, { min: threshold_2024_Rodu_Sultan.lower, max: threshold_2024_Rodu_Sultan.upper, palette: ['green'] }, 'Masked Image (Rodu_Sultan 2024)');

// /* --- Compute Pixel Count and Area for the Masked Image --- */
// var pixelCount2024 = masked2024.reduceRegion({
//   reducer: ee.Reducer.count(),
//   geometry: targetAOI,
//   scale: scale,
//   maxPixels: 1e13
// });

// // Calculate area (each pixel is scale x scale square meters)
// var pixelAreaM2 = scale * scale; // 10m x 10m = 100 m²
// var areaM2_2024 = ee.Number(pixelCount2024.get('b1')).multiply(pixelAreaM2);
// var areaAcres_2024 = areaM2_2024.divide(4046.8564224); // Conversion: 1 acre = 4046.86 m²
// print('Computed Area (acres) (Rodu_Sultan 2024):', areaAcres_2024);

// /* --- Apply the Threshold Mask to the NDVI Collection --- */
// // Extract the mask from the 2024 reference image and apply it to each NDVI image.
// var rodThresholdMask = masked2024.mask();
// var ndviMaskedCollection = sentinel2NDVI.map(function(image) {
//   return image.updateMask(rodThresholdMask);
// });

// // Create a median composite for visualization.
// var ndviComposite = ndviMaskedCollection.median();
// Map.addLayer(ndviComposite, "", "NDVI (Rodu_Sultan Threshold Mask)");
// print("NDVI with Rodu_Sultan Threshold Mask:", ndviComposite);

// /* --- Further Threshold NDVI (e.g., NDVI >= 0.3) --- */
// var ndviThresholded = ndviComposite.updateMask(ndviComposite.gte(0.3));
// Map.addLayer(ndviThresholded, '', "NDVI (Rodu_Sultan Mask, NDVI >= 0.3)");

// // Compute area for the Feb 8–13 composite.
// var ndviPixelCount = ndviThresholded.reduceRegion({
//   reducer: ee.Reducer.count(),
//   geometry: targetAOI,
//   scale: scale,
//   maxPixels: 1e13
// });
// var areaM2NDVI = ee.Number(ndviPixelCount.get('NDVI')).multiply(pixelAreaM2);
// var areaAcresNDVI = areaM2NDVI.divide(4046.8564224);
// print("Computed Area (acres) for NDVI (>= 0.3) Feb 8–13 (Rodu_Sultan):", areaAcresNDVI);

// // ----- New Block: Process Feb 14 Imagery -----
// // Define dates for Feb 13–14 imagery.
// var feb13Date = '2025-02-13';
// var feb14Date = '2025-02-14';

// // Load Sentinel-2 imagery for Feb 14.
// var sentinel2Feb14 = ee.ImageCollection("COPERNICUS/S2_SR")
//   .filterDate(feb13Date, feb14Date)
//   .filterBounds(targetAOI)
//   .map(function(img) {
//     var scaled = img.divide(10000);
//     return addNDVI(scaled).copyProperties(img, img.propertyNames());
//   })
//   .select('NDVI');

// // Create a composite (or pick the first image if only one is available) for Feb 14.
// var ndviFeb14 = sentinel2Feb14.median();
 
// // Apply the NDVI threshold for Feb 14 (NDVI >= 0.3).
// var ndviFeb14Thresholded = ndviFeb14.updateMask(ndviFeb14.gte(0.23));
 
// // Restrict analysis to the area defined by the Feb 8–13 NDVI threshold mask.
// var feb14Masked = ndviFeb14Thresholded.updateMask(ndviThresholded.mask());
// Map.addLayer(feb14Masked, {min: 0.3, max: 1, palette: ['yellow']}, 'NDVI (Rodu_Sultan Feb 14, NDVI>=0.3)');
 
// // Compute area for Feb 14 thresholded pixels within the standard area.
// var pixelCountFeb14 = feb14Masked.reduceRegion({
//   reducer: ee.Reducer.count(),
//   geometry: targetAOI,
//   scale: scale,
//   maxPixels: 1e13
// });
// var areaM2Feb14 = ee.Number(pixelCountFeb14.get('NDVI')).multiply(pixelAreaM2);
// var areaAcresFeb14 = areaM2Feb14.divide(4046.8564224);
// print("Computed Area (acres) for NDVI (>= 0.3) Feb 14 (Rodu_Sultan):", areaAcresFeb14);








////////////////////KOT MAPAL

// /* --- Parameters --- */
// // Date range for Sentinel-2
// var startDate = '2025-02-08';
// var endDate   = '2025-02-13';

// // Define target Area of Interest (AOI)
// // Set to Kot_Mapal for processing the Kot_Mapal area.
// var targetAOI = Kot_Mapal;  

// // Define target CRS and scale (Sentinel-2 resolution)
// var targetCRS = 'EPSG:32643'; // UTM Zone 43N
// var scale = 10;               // 10m resolution

// /* --- Load and Prepare Sentinel-2 Data --- */
// // Load Sentinel-2 Surface Reflectance collection, filter by date and AOI.
// var sentinel2Collection = ee.ImageCollection("COPERNICUS/S2_SR")
//   .filterDate(startDate, endDate)
//   .filterBounds(targetAOI);
// print("Sentinel-2 Data (Kot_Mapal):", sentinel2Collection);

// function addNDVI(image, nirBand, redBand) {
//   // Assign default values if parameters are undefined.
//   nirBand = (nirBand === undefined) ? 'B8' : nirBand;
//   redBand = (redBand === undefined) ? 'B4' : redBand;
  
//   var ndvi = image.normalizedDifference([nirBand, redBand]).rename('NDVI');
//   return image.addBands(ndvi);
// }

// /* --- Process Sentinel-2 Collection for NDVI --- */
// var sentinel2NDVI = sentinel2Collection
//   .map(function(img) {
//     // Scale the image (Sentinel-2 SR values are scaled by 10000)
//     var scaled = img.divide(10000);
//     // Compute NDVI and copy image properties
//     return addNDVI(scaled).copyProperties(img, img.propertyNames());
//   })
//   .select('NDVI');
// print("Sentinel-2 NDVI Collection (Kot_Mapal):", sentinel2NDVI);

// /* --- Process a Reference Image for 2024 Data --- */
// // Reproject the reference image to the target CRS.
// var reprojected2024 = NBSI_SUGARCANE_2024_Kot_Mapal.reproject({
//   crs: targetCRS,
//   scale: scale
// });

// /* --- Apply Threshold Mask to the Reprojected Image --- */
// // Define threshold range for Kot_Mapal 2024 data.
// var threshold_2024_Kot_Mapal = { lower: 0.000003955, upper: 0.000006876 };

// var masked2024 = reprojected2024.updateMask(
//   reprojected2024.gte(threshold_2024_Kot_Mapal.lower)
//     .and(reprojected2024.lte(threshold_2024_Kot_Mapal.upper))
// );
// Map.addLayer(masked2024, { min: threshold_2024_Kot_Mapal.lower, max: threshold_2024_Kot_Mapal.upper, palette: ['green'] }, 'Masked Image (Kot_Mapal 2024)');

// /* --- Compute Pixel Count and Area for the Masked Image --- */
// var pixelCount2024 = masked2024.reduceRegion({
//   reducer: ee.Reducer.count(),
//   geometry: targetAOI,
//   scale: scale,
//   maxPixels: 1e13
// });
  
// // Calculate area (each pixel is scale x scale square meters)
// var pixelAreaM2 = scale * scale; // 10m x 10m = 100 m²
// var areaM2_2024 = ee.Number(pixelCount2024.get('b1')).multiply(pixelAreaM2);
// var areaAcres_2024 = areaM2_2024.divide(4046.8564224); // 1 acre = 4046.86 m²
// print('Computed Area (acres) (Kot_Mapal 2024):', areaAcres_2024);

// /* --- Apply the Threshold Mask to the NDVI Collection --- */
// // Extract the mask from the 2024 image and apply it to each NDVI image.
// var kotThresholdMask = masked2024.mask();
// var ndviMaskedCollection = sentinel2NDVI.map(function(image) {
//   return image.updateMask(kotThresholdMask);
// });

// // Create a median composite for visualization.
// var ndviComposite = ndviMaskedCollection.median();
// Map.addLayer(ndviComposite, "", "NDVI (Kot_Mapal Threshold Mask)");
// print("NDVI with Kot_Mapal Threshold Mask:", ndviComposite);

// /* --- Further Threshold NDVI (e.g., NDVI >= 0.3) --- */
// var ndviThresholded = ndviComposite.updateMask(ndviComposite.gte(0.3));
// Map.addLayer(ndviThresholded, '', "NDVI (Kot_Mapal Mask, NDVI >= 0.3)");

// // Compute area for Feb 8–13 composite
// var ndviPixelCount = ndviThresholded.reduceRegion({
//   reducer: ee.Reducer.count(),
//   geometry: targetAOI,
//   scale: scale,
//   maxPixels: 1e13
// });
// var areaM2NDVI = ee.Number(ndviPixelCount.get('NDVI')).multiply(pixelAreaM2);
// var areaAcresNDVI = areaM2NDVI.divide(4046.8564224);
// print("Computed Area (acres) for NDVI (>= 0.3) Feb 8–13 (Kot_Mapal):", areaAcresNDVI);

// // ----- New Block: Process Feb 14 Imagery -----
// // Define dates for Feb 13–14 imagery
// var feb13Date = '2025-02-13';
// var feb14Date = '2025-02-14';

// // Load Sentinel-2 imagery for Feb 14
// var sentinel2Feb14 = ee.ImageCollection("COPERNICUS/S2_SR")
//   .filterDate(feb13Date, feb14Date)
//   .filterBounds(targetAOI)
//   .map(function(img) {
//     var scaled = img.divide(10000);
//     return addNDVI(scaled).copyProperties(img, img.propertyNames());
//   })
//   .select('NDVI');

// // Create a composite (or pick the first image if only one is available)
// var ndviFeb14 = sentinel2Feb14.median();
 
// // Apply the NDVI threshold for Feb 14 (NDVI >= 0.3)
// var ndviFeb14Thresholded = ndviFeb14.updateMask(ndviFeb14.gte(0.22));
 
// // Restrict analysis to the area defined by the Feb 8–13 NDVI thresholded mask
// var feb14Masked = ndviFeb14Thresholded.updateMask(ndviThresholded.mask());
// Map.addLayer(feb14Masked, {min: 0.3, max: 1, palette: ['yellow']}, 'NDVI (Kot_Mapal Feb 14, NDVI>=0.3)');
 
// // Compute area for Feb 14 thresholded pixels within the standard area
// var pixelCountFeb14 = feb14Masked.reduceRegion({
//   reducer: ee.Reducer.count(),
//   geometry: targetAOI,
//   scale: scale,
//   maxPixels: 1e13
// });
// var areaM2Feb14 = ee.Number(pixelCountFeb14.get('NDVI')).multiply(pixelAreaM2);
// var areaAcresFeb14 = areaM2Feb14.divide(4046.8564224);
// print("Computed Area (acres) for NDVI (>= 0.3) Feb 14 (Kot_Mapal):", areaAcresFeb14);






///////////////////////////KOT BAHADAR 

// /* --- Parameters --- */
// // Date range for Sentinel-2
// var startDate = '2025-02-08';
// var endDate   = '2025-02-13';

// // Define target Area of Interest (AOI)
// // Set to Kot_Bahadar for processing the Kot_Bahadar area.
// var targetAOI = Kot_Bahadar;  

// // Define target CRS and scale (Sentinel-2 resolution)
// var targetCRS = 'EPSG:32643'; // UTM Zone 43N
// var scale = 10;               // 10m resolution

// /* --- Load and Prepare Sentinel-2 Data --- */
// // Load Sentinel-2 Surface Reflectance collection, filter by date and AOI.
// var sentinel2Collection = ee.ImageCollection("COPERNICUS/S2_SR")
//   .filterDate(startDate, endDate)
//   .filterBounds(targetAOI);
// print("Sentinel-2 Data (Kot_Bahadar):", sentinel2Collection);

// function addNDVI(image, nirBand, redBand) {
//   // Assign default values if parameters are undefined.
//   nirBand = (nirBand === undefined) ? 'B8' : nirBand;
//   redBand = (redBand === undefined) ? 'B4' : redBand;
  
//   var ndvi = image.normalizedDifference([nirBand, redBand]).rename('NDVI');
//   return image.addBands(ndvi);
// }

// /* --- Process Sentinel-2 Collection for NDVI --- */
// var sentinel2NDVI = sentinel2Collection
//   .map(function(img) {
//     // Scale the image (Sentinel-2 SR values are scaled by 10000)
//     var scaled = img.divide(10000);
//     // Compute NDVI and copy image properties
//     return addNDVI(scaled).copyProperties(img, img.propertyNames());
//   })
//   .select('NDVI');
// print("Sentinel-2 NDVI Collection (Kot_Bahadar):", sentinel2NDVI);

// /* --- Process a Reference Image for 2024 Data --- */
// // Reproject the reference image to the target CRS.
// var reprojected2024 = NBSI_SUGARCANE_2024_Kot_Bahadar.reproject({
//   crs: targetCRS,
//   scale: scale
// });

// /* --- Apply Threshold Mask to the Reprojected Image --- */
// // Define threshold range for Kot_Bahadar 2024 data.
// var threshold_2024_Kot_Bahadar = { lower: 0.000003942, upper: 0.00000603 };

// var masked2024 = reprojected2024.updateMask(
//   reprojected2024.gte(threshold_2024_Kot_Bahadar.lower)
//     .and(reprojected2024.lte(threshold_2024_Kot_Bahadar.upper))
// );
// Map.addLayer(masked2024, { min: threshold_2024_Kot_Bahadar.lower, max: threshold_2024_Kot_Bahadar.upper, palette: ['green'] }, 'Masked Image (Kot_Bahadar 2024)');

// /* --- Compute Pixel Count and Area for the Masked Image --- */
// var pixelCount2024 = masked2024.reduceRegion({
//   reducer: ee.Reducer.count(),
//   geometry: targetAOI,
//   scale: scale,
//   maxPixels: 1e13
// });
  
// // Calculate area (each pixel is scale x scale square meters)
// var pixelAreaM2 = scale * scale; // 10m x 10m = 100 m²
// var areaM2_2024 = ee.Number(pixelCount2024.get('b1')).multiply(pixelAreaM2);
// var areaAcres_2024 = areaM2_2024.divide(4046.8564224); // 1 acre = 4046.86 m²
// print('Computed Area (acres) (Kot_Bahadar 2024):', areaAcres_2024);

// /* --- Apply the Threshold Mask to the NDVI Collection --- */
// // Extract the mask from the 2024 reference image and apply it to each NDVI image.
// var kotBahadarThresholdMask = masked2024.mask();
// var ndviMaskedCollection = sentinel2NDVI.map(function(image) {
//   return image.updateMask(kotBahadarThresholdMask);
// });

// // Create a median composite for visualization.
// var ndviComposite = ndviMaskedCollection.median();
// Map.addLayer(ndviComposite, "", "NDVI (Kot_Bahadar Threshold Mask)");
// print("NDVI with Kot_Bahadar Threshold Mask:", ndviComposite);

// /* --- Further Threshold NDVI (e.g., NDVI >= 0.3) --- */
// var ndviThresholded = ndviComposite.updateMask(ndviComposite.gte(0.3));
// Map.addLayer(ndviThresholded, '', "NDVI (Kot_Bahadar Mask, NDVI >= 0.3)");

// // Compute area for Feb 8–13 composite.
// var ndviPixelCount = ndviThresholded.reduceRegion({
//   reducer: ee.Reducer.count(),
//   geometry: targetAOI,
//   scale: scale,
//   maxPixels: 1e13
// });
// var areaM2NDVI = ee.Number(ndviPixelCount.get('NDVI')).multiply(pixelAreaM2);
// var areaAcresNDVI = areaM2NDVI.divide(4046.8564224);
// print("Computed Area (acres) for NDVI (>= 0.3) Feb 8–13 (Kot_Bahadar):", areaAcresNDVI);

// /* --- New Block: Process Feb 14 Imagery --- */
// // Define dates for Feb 13–14 imagery.
// var feb13Date = '2025-02-13';
// var feb14Date = '2025-02-14';

// // Load Sentinel-2 imagery for Feb 14.
// var sentinel2Feb14 = ee.ImageCollection("COPERNICUS/S2_SR")
//   .filterDate(feb13Date, feb14Date)
//   .filterBounds(targetAOI)
//   .map(function(img) {
//     var scaled = img.divide(10000);
//     return addNDVI(scaled).copyProperties(img, img.propertyNames());
//   })
//   .select('NDVI');

// // Create a composite (or pick the first image if only one is available) for Feb 14.
// var ndviFeb14 = sentinel2Feb14.median();
 
// // Apply the NDVI threshold for Feb 14 (NDVI >= 0.3).
// var ndviFeb14Thresholded = ndviFeb14.updateMask(ndviFeb14.gte(0.22));
 
// // Restrict analysis to the area defined by the Feb 8–13 NDVI thresholded mask.
// var feb14Masked = ndviFeb14Thresholded.updateMask(ndviThresholded.mask());
// Map.addLayer(feb14Masked, {min: 0.3, max: 1, palette: ['yellow']}, 'NDVI (Kot_Bahadar Feb 14, NDVI>=0.3)');
 
// // Compute area for Feb 14 thresholded pixels within the standard area.
// var pixelCountFeb14 = feb14Masked.reduceRegion({
//   reducer: ee.Reducer.count(),
//   geometry: targetAOI,
//   scale: scale,
//   maxPixels: 1e13
// });
// var areaM2Feb14 = ee.Number(pixelCountFeb14.get('NDVI')).multiply(pixelAreaM2);
// var areaAcresFeb14 = areaM2Feb14.divide(4046.8564224);
// print("Computed Area (acres) for NDVI (>= 0.3) Feb 14 (Kot_Bahadar):", areaAcresFeb14);







//////////////////////////////////////Mahmood kot

// /* --- Parameters --- */
// // Date range for Sentinel-2
// var startDate = '2025-02-08';
// var endDate   = '2025-02-13';

// // Define target Area of Interest (AOI)
// // Set to Mahmood_Kot for processing the Mahmood_Kot area.
// var targetAOI = Mahmood_Kot;  

// // Define target CRS and scale (Sentinel-2 resolution)
// var targetCRS = 'EPSG:32643'; // UTM Zone 43N
// var scale = 10;               // 10m resolution

// /* --- Load and Prepare Sentinel-2 Data --- */
// // Load Sentinel-2 Surface Reflectance collection, filtering by date and AOI.
// var sentinel2Collection = ee.ImageCollection("COPERNICUS/S2_SR")
//   .filterDate(startDate, endDate)
//   .filterBounds(targetAOI);
// print("Sentinel-2 Data (Mahmood_Kot):", sentinel2Collection);

// function addNDVI(image, nirBand, redBand) {
//   // Assign default values if parameters are undefined.
//   nirBand = (nirBand === undefined) ? 'B8' : nirBand;
//   redBand = (redBand === undefined) ? 'B4' : redBand;
  
//   var ndvi = image.normalizedDifference([nirBand, redBand]).rename('NDVI');
//   return image.addBands(ndvi);
// }

// function maskS2sr(image) {
//   var scl = image.select('SCL');
//   // Remove clouds (9) and snow (11); keep shadows (8) if desired.
//   var cloudMask = scl.neq(9).and(scl.neq(11));
//   return image.updateMask(cloudMask);
// }

// /* --- Process Sentinel-2 Collection for NDVI --- */
// var sentinel2NDVI = sentinel2Collection
//   .map(maskS2sr)
//   .map(function(img) {
//     // Scale the image (Sentinel-2 SR values are scaled by 10000)
//     var scaled = img.divide(10000);
//     // Compute NDVI and copy image properties
//     return addNDVI(scaled).copyProperties(img, img.propertyNames());
//   })
//   .select('NDVI');
// print("Sentinel-2 NDVI Collection (Mahmood_Kot):", sentinel2NDVI);

// /* --- Process a Reference Image for 2024 Data --- */
// // Reproject the reference image to the target CRS.
// var reprojected2024 = NBSI_SUGARCANE_2024_Mahmood_Kot.reproject({
//   crs: targetCRS,
//   scale: scale
// });

// /* --- Apply Threshold Mask to the Reprojected Image --- */
// // Define threshold range for Mahmood_Kot 2024 data.
// var threshold_2024_Mahmood_Kot = { lower: 0.000004262, upper: 0.000006613 };

// var masked2024 = reprojected2024.updateMask(
//   reprojected2024.gte(threshold_2024_Mahmood_Kot.lower)
//     .and(reprojected2024.lte(threshold_2024_Mahmood_Kot.upper))
// );
// Map.addLayer(masked2024, { min: threshold_2024_Mahmood_Kot.lower, max: threshold_2024_Mahmood_Kot.upper, palette: ['green'] }, 'Masked Image (Mahmood_Kot 2024)');

// /* --- Compute Pixel Count and Area for the Masked Image --- */
// var pixelCount2024 = masked2024.reduceRegion({
//   reducer: ee.Reducer.count(),
//   geometry: targetAOI,
//   scale: scale,
//   maxPixels: 1e13
// });
  
// // Calculate area (each pixel is scale x scale square meters)
// var pixelAreaM2 = scale * scale; // 10m x 10m = 100 m²
// var areaM2_2024 = ee.Number(pixelCount2024.get('b1')).multiply(pixelAreaM2);
// var areaAcres_2024 = areaM2_2024.divide(4046.8564224); // 1 acre = 4046.86 m²
// print('Computed Area (acres) (Mahmood_Kot 2024):', areaAcres_2024);

// /* --- Apply the Threshold Mask to the NDVI Collection --- */
// // Extract the mask from the 2024 reference image and apply it to each NDVI image.
// var mahmoodKotThresholdMask = masked2024.mask();
// var ndviMaskedCollection = sentinel2NDVI.map(function(image) {
//   return image.updateMask(mahmoodKotThresholdMask);
// });

// // Create a median composite for visualization.
// var ndviComposite = ndviMaskedCollection.median();
// Map.addLayer(ndviComposite, "", "NDVI (Mahmood_Kot Threshold Mask)");
// print("NDVI with Mahmood_Kot Threshold Mask:", ndviComposite);

// /* --- Further Threshold NDVI (e.g., NDVI >= 0.3) --- */
// var ndviThresholded = ndviComposite.updateMask(ndviComposite.gte(0.3));
// Map.addLayer(ndviThresholded, '', "NDVI (Mahmood_Kot Mask, NDVI >= 0.3)");

// // Compute area for the Feb 8–13 composite.
// var ndviPixelCount = ndviThresholded.reduceRegion({
//   reducer: ee.Reducer.count(),
//   geometry: targetAOI,
//   scale: scale,
//   maxPixels: 1e13
// });
// var areaM2NDVI = ee.Number(ndviPixelCount.get('NDVI')).multiply(pixelAreaM2);
// var areaAcresNDVI = areaM2NDVI.divide(4046.8564224);
// print("Computed Area (acres) for NDVI (>= 0.3) Feb 8–13 (Mahmood_Kot):", areaAcresNDVI);

// /* --- New Block: Process Feb 14 Imagery --- */
// // Define dates for Feb 13–14 imagery.
// var feb13Date = '2025-02-13';
// var feb14Date = '2025-02-14';

// // Load Sentinel-2 imagery for Feb 14.
// var sentinel2Feb14 = ee.ImageCollection("COPERNICUS/S2_SR")
//   .filterDate(feb13Date, feb14Date)
//   .filterBounds(targetAOI)
//   .map(function(img) {
//     var scaled = img.divide(10000);
//     var masked = maskS2sr(scaled);
//     return addNDVI(scaled).copyProperties(img, img.propertyNames());
//   })
//   .select('NDVI');

// // Create a composite (or pick the first image if only one is available) for Feb 14.
// var ndviFeb14 = sentinel2Feb14.median();
 
// // Apply the NDVI threshold for Feb 14 (NDVI >= 0.3).
// var ndviFeb14Thresholded = ndviFeb14.updateMask(ndviFeb14.gte(0.23));
 
// // Restrict analysis to the area defined by the Feb 8–13 NDVI thresholded mask.
// var feb14Masked = ndviFeb14Thresholded.updateMask(ndviThresholded.mask());
// Map.addLayer(feb14Masked, {min: 0.3, max: 1, palette: ['yellow']}, 'NDVI (Mahmood_Kot Feb 14, NDVI>=0.3)');
 
// // Compute area for Feb 14 thresholded pixels within the standard area.
// var pixelCountFeb14 = feb14Masked.reduceRegion({
//   reducer: ee.Reducer.count(),
//   geometry: targetAOI,
//   scale: scale,
//   maxPixels: 1e13
// });
// var areaM2Feb14 = ee.Number(pixelCountFeb14.get('NDVI')).multiply(pixelAreaM2);
// var areaAcresFeb14 = areaM2Feb14.divide(4046.8564224);
// print("Computed Area (acres) for NDVI (>= 0.3) Feb 14 (Mahmood_Kot):", areaAcresFeb14);









////////////////////////////////
///////////////////////////////Garhmaharaja

// /* --- Parameters --- */
// // Date range for Sentinel-2 baseline composite (Feb 8–13)
// var startDate = '2025-02-08';
// var endDate   = '2025-02-13';

// // Define target Area of Interest (AOI)
// // Set to Garhmaharaja for processing the Garhmaharaja area.
// var targetAOI = Garhmaharaja;  

// // Define target CRS and scale (Sentinel-2 resolution)
// var targetCRS = 'EPSG:32643'; // UTM Zone 43N
// var scale = 10;               // 10m resolution



// // Function to mask clouds, cirrus, snow, and cloud shadows using the SCL band.
// function maskS2sr(image) {
//   var scl = image.select('SCL');
//   // Remove clouds (9) and snow (11); keep shadows (8) if desired.
//   var cloudMask = scl.neq(9).and(scl.neq(11));
//   return image.updateMask(cloudMask);
// }




// /* --- Load and Prepare Sentinel-2 Data --- */
// // Load Sentinel-2 Surface Reflectance collection, filtering by date and AOI.
// var sentinel2Collection = ee.ImageCollection("COPERNICUS/S2_SR")
//   .filterDate(startDate, endDate)
//   .filterBounds(targetAOI);
// print("Sentinel-2 Data (Garhmaharaja):", sentinel2Collection);

// function addNDVI(image, nirBand, redBand) {
//   // Default band assignments: NIR=B8, Red=B4.
//   nirBand = (nirBand === undefined) ? 'B8' : nirBand;
//   redBand = (redBand === undefined) ? 'B4' : redBand;
  
//   var ndvi = image.normalizedDifference([nirBand, redBand]).rename('NDVI');
//   return image.addBands(ndvi);
// }

// /* --- Process Sentinel-2 Collection for NDVI --- */
// var sentinel2NDVI = sentinel2Collection
//   .map(maskS2sr)
//   .map(function(img) {
//     // Scale the image (Sentinel-2 SR values are scaled by 10000)
//     var scaled = img.divide(10000);
//     // Compute NDVI and copy image properties.
//     return addNDVI(scaled).copyProperties(img, img.propertyNames());
//   })
//   .select('NDVI');
// print("Sentinel-2 NDVI Collection (Garhmaharaja):", sentinel2NDVI);

// /* --- Process a Reference Image for 2024 Data --- */
// // Reproject the reference image to the target CRS.
// var reprojected2024 = NBSI_SUGARCANE_2024_Garhmaharaja.reproject({
//   crs: targetCRS,
//   scale: scale
// });

// /* --- Apply Threshold Mask to the Reprojected Image --- */
// // Define threshold range for Garhmaharaja 2024 data.
// var threshold_2024_Garhmaharaja = { lower: 0.000003602, upper: 0.000007415 };

// var masked2024 = reprojected2024.updateMask(
//   reprojected2024.gte(threshold_2024_Garhmaharaja.lower)
//     .and(reprojected2024.lte(threshold_2024_Garhmaharaja.upper))
// );
// Map.addLayer(masked2024, { min: threshold_2024_Garhmaharaja.lower, max: threshold_2024_Garhmaharaja.upper, palette: ['green'] }, 'Masked Image (Garhmaharaja 2024)');

// /* --- Compute Pixel Count and Area for the Masked Image --- */
// var pixelCount2024 = masked2024.reduceRegion({
//   reducer: ee.Reducer.count(),
//   geometry: targetAOI,
//   scale: scale,
//   maxPixels: 1e13
// });
  
// // Calculate area (each pixel is 10m x 10m = 100 m²)
// var pixelAreaM2 = scale * scale;
// var areaM2_2024 = ee.Number(pixelCount2024.get('b1')).multiply(pixelAreaM2);
// var areaAcres_2024 = areaM2_2024.divide(4046.8564224);
// print('Computed Area (acres) (Garhmaharaja 2024):', areaAcres_2024);

// /* --- Apply the Threshold Mask to the NDVI Collection --- */
// // Extract the mask from the 2024 reference image and apply it to each NDVI image.
// var garhmaharajaThresholdMask = masked2024.mask();
// var ndviMaskedCollection = sentinel2NDVI.map(function(image) {
//   return image.updateMask(garhmaharajaThresholdMask);
// });

// // Create a median composite for visualization.
// var ndviComposite = ndviMaskedCollection.median();
// Map.addLayer(ndviComposite, {}, "NDVI (Garhmaharaja Threshold Mask)");
// print("NDVI with Garhmaharaja Threshold Mask:", ndviComposite);

// /* --- Further Threshold NDVI (NDVI >= 0.3) --- */
// var ndviThresholded = ndviComposite.updateMask(ndviComposite.gte(0.3));
// Map.addLayer(ndviThresholded, {}, "NDVI (Garhmaharaja Mask, NDVI >= 0.3)");

// // Compute area for the Feb 8–13 composite.
// var ndviPixelCount = ndviThresholded.reduceRegion({
//   reducer: ee.Reducer.count(),
//   geometry: targetAOI,
//   scale: scale,
//   maxPixels: 1e13
// });
// var areaM2NDVI = ee.Number(ndviPixelCount.get('NDVI')).multiply(pixelAreaM2);
// var areaAcresNDVI = areaM2NDVI.divide(4046.8564224);
// print("Computed Area (acres) for NDVI (>= 0.3) Feb 8–13 (Garhmaharaja):", areaAcresNDVI);

// /* --- New Block: Process Feb 14 Imagery --- */
// // Define dates for Feb 13–14 imagery.
// var feb13Date = '2025-02-13';
// var feb14Date = '2025-02-14';

// // Load Sentinel-2 imagery for Feb 14.
// var sentinel2Feb14 = ee.ImageCollection("COPERNICUS/S2_SR")
//   .filterDate(feb13Date, feb14Date)
//   .filterBounds(targetAOI)
//   .map(function(img) {
//     var scaled = img.divide(10000);
//     // Apply the cloud/snow mask.
//     var masked = maskS2sr(scaled);
//     return addNDVI(masked).copyProperties(img, img.propertyNames());
//   })
//   .select('NDVI');

// // Create a composite (or select the appropriate image) for Feb 14.
// var ndviFeb14 = sentinel2Feb14.median().clip(targetAOI);

// Map.addLayer(ndviFeb14, '', "14feb composite image with ndvi")
 
// // Apply the NDVI threshold for Feb 14 (NDVI >= 0.3).
// var ndviFeb14Thresholded = ndviFeb14.updateMask(ndviFeb14.gte(0.23));
 
// // Restrict analysis to the area defined by the baseline NDVI threshold mask.
// var feb14Masked = ndviFeb14Thresholded.updateMask(ndviThresholded.mask());
// Map.addLayer(feb14Masked, {min: 0.3, max: 1, palette: ['yellow']}, 'NDVI (Garhmaharaja Feb 14, NDVI>=0.3)');
 
// // Compute area for Feb 14 thresholded pixels.
// var pixelCountFeb14 = feb14Masked.reduceRegion({
//   reducer: ee.Reducer.count(),
//   geometry: targetAOI,
//   scale: scale,
//   maxPixels: 1e13
// });
// var areaM2Feb14 = ee.Number(pixelCountFeb14.get('NDVI')).multiply(pixelAreaM2);
// var areaAcresFeb14 = areaM2Feb14.divide(4046.8564224);
// print("Computed Area (acres) for NDVI (>= 0.3) Feb 14 (Garhmaharaja):", areaAcresFeb14);













////////////////////////////////////////
///////////////////////////////////////AhmedpurSial


// /* --- Parameters --- */
// // Date range for Sentinel-2 baseline composite (Feb 8–13)
// var startDate = '2025-02-08';
// var endDate   = '2025-02-13';

// // Define target Area of Interest (AOI)
// // Set to AhmedpurSial for processing the AhmedpurSial area.
// var targetAOI = AhmedpurSial;  

// // Define target CRS and scale (Sentinel-2 resolution)
// var targetCRS = 'EPSG:32643'; // UTM Zone 43N
// var scale = 10;               // 10m resolution

// /* --- Load and Prepare Sentinel-2 Data --- */
// // Load Sentinel-2 Surface Reflectance collection, filtering by date and AOI.
// var sentinel2Collection = ee.ImageCollection("COPERNICUS/S2_SR")
//   .filterDate(startDate, endDate)
//   .filterBounds(targetAOI);
// print("Sentinel-2 Data (AhmedpurSial):", sentinel2Collection);

// function addNDVI(image, nirBand, redBand) {
//   // Default assignments: NIR = B8, Red = B4.
//   nirBand = (nirBand === undefined) ? 'B8' : nirBand;
//   redBand = (redBand === undefined) ? 'B4' : redBand;
  
//   var ndvi = image.normalizedDifference([nirBand, redBand]).rename('NDVI');
//   return image.addBands(ndvi);
// }

// /* --- Process Sentinel-2 Collection for NDVI --- */
// var sentinel2NDVI = sentinel2Collection
//   .map(function(img) {
//     // Scale the image (Sentinel-2 SR values are scaled by 10000)
//     var scaled = img.divide(10000);
//     // Compute NDVI and retain image properties.
//     return addNDVI(scaled).copyProperties(img, img.propertyNames());
//   })
//   .select('NDVI');
// print("Sentinel-2 NDVI Collection (AhmedpurSial):", sentinel2NDVI);

// /* --- Process the Reference Image for 2024 Data --- */
// // Reproject the reference image to the target CRS.
// var reprojected2024 = NBSI_SUGARCANE_2024_AhmedpurSial.reproject({
//   crs: targetCRS,
//   scale: scale
// });

// /* --- Apply Threshold Mask to the Reprojected Image --- */
// // Define threshold range for AhmedpurSial 2024 data.
// var threshold_2024_AhmedpurSial = { lower: 0.000003044, upper: 0.000004262 };

// var masked2024 = reprojected2024.updateMask(
//   reprojected2024.gte(threshold_2024_AhmedpurSial.lower)
//     .and(reprojected2024.lte(threshold_2024_AhmedpurSial.upper))
// );
// Map.addLayer(masked2024, { 
//   min: threshold_2024_AhmedpurSial.lower, 
//   max: threshold_2024_AhmedpurSial.upper, 
//   palette: ['green'] 
// }, 'Masked Image (AhmedpurSial 2024)');

// /* --- Compute Pixel Count and Area for the Masked Reference Image --- */
// var pixelCount2024 = masked2024.reduceRegion({
//   reducer: ee.Reducer.count(),
//   geometry: targetAOI,
//   scale: scale,
//   maxPixels: 1e13
// });
  
// // Each pixel covers scale x scale square meters.
// var pixelAreaM2 = scale * scale;
// var areaM2_2024 = ee.Number(pixelCount2024.get('b1')).multiply(pixelAreaM2);
// var areaAcres_2024 = areaM2_2024.divide(4046.8564224); // 1 acre = 4046.86 m²
// print('Computed Area (acres) (AhmedpurSial 2024):', areaAcres_2024);

// /* --- Apply the Threshold Mask to the NDVI Collection --- */
// // Use the mask from the 2024 reference image on each NDVI image.
// var ahmedpurSialThresholdMask = masked2024.mask();
// var ndviMaskedCollection = sentinel2NDVI.map(function(image) {
//   return image.updateMask(ahmedpurSialThresholdMask);
// });

// // Create a median composite for visualization.
// var ndviComposite = ndviMaskedCollection.median();
// Map.addLayer(ndviComposite, {}, "NDVI (AhmedpurSial Threshold Mask)");
// print("NDVI with AhmedpurSial Threshold Mask:", ndviComposite);

// /* --- Further Threshold NDVI (e.g., NDVI >= 0.3) --- */
// var ndviThresholded = ndviComposite.updateMask(ndviComposite.gte(0.3));
// Map.addLayer(ndviThresholded, {}, "NDVI (AhmedpurSial Mask, NDVI >= 0.3)");

// // Compute area for the Feb 8–13 composite.
// var ndviPixelCount = ndviThresholded.reduceRegion({
//   reducer: ee.Reducer.count(),
//   geometry: targetAOI,
//   scale: scale,
//   maxPixels: 1e13
// });
// var areaM2NDVI = ee.Number(ndviPixelCount.get('NDVI')).multiply(pixelAreaM2);
// var areaAcresNDVI = areaM2NDVI.divide(4046.8564224);
// print("Computed Area (acres) for NDVI (>= 0.3) Feb 8–13 (AhmedpurSial):", areaAcresNDVI);

// /* --- New Block: Process Feb 14 Imagery --- */
// // Define dates for Feb 13–14 imagery.
// var feb13Date = '2025-02-13';
// var feb14Date = '2025-02-14';

// // Load Sentinel-2 imagery for Feb 14.
// var sentinel2Feb14 = ee.ImageCollection("COPERNICUS/S2_SR")
//   .filterDate(feb13Date, feb14Date)
//   .filterBounds(targetAOI)
//   .map(function(img) {
//     var scaled = img.divide(10000);
//     return addNDVI(scaled).copyProperties(img, img.propertyNames());
//   })
//   .select('NDVI');

// // Create a composite for Feb 14.
// var ndviFeb14 = sentinel2Feb14.median();
 
// // Apply the NDVI threshold for Feb 14 (NDVI >= 0.3).
// var ndviFeb14Thresholded = ndviFeb14.updateMask(ndviFeb14.gte(0.23));
 
// // Restrict analysis to the area defined by the baseline NDVI mask.
// var feb14Masked = ndviFeb14Thresholded.updateMask(ndviThresholded.mask());
// Map.addLayer(feb14Masked, {min: 0.3, max: 1, palette: ['yellow']}, 'NDVI (AhmedpurSial Feb 14, NDVI>=0.3)');
 
// // Compute area for Feb 14 thresholded pixels.
// var pixelCountFeb14 = feb14Masked.reduceRegion({
//   reducer: ee.Reducer.count(),
//   geometry: targetAOI,
//   scale: scale,
//   maxPixels: 1e13
// });
// var areaM2Feb14 = ee.Number(pixelCountFeb14.get('NDVI')).multiply(pixelAreaM2);
// var areaAcresFeb14 = areaM2Feb14.divide(4046.8564224);
// print("Computed Area (acres) for NDVI (>= 0.3) Feb 14 (AhmedpurSial):", areaAcresFeb14);




///////////////////////////////////////
//////////////////////////////////////  Rangpur

/* --- Parameters --- */
// Date range for Sentinel-2 baseline composite (Feb 8–13)
var startDate = '2025-02-08';
var endDate   = '2025-02-13';

// Define target Area of Interest (AOI)
// Set to Rangpur for processing the Rangpur area.
var targetAOI = Rangpur;  

// Define target CRS and scale (Sentinel-2 resolution)
var targetCRS = 'EPSG:32643'; // UTM Zone 43N
var scale = 10;               // 10m resolution

// Function to mask clouds, cirrus, snow, and cloud shadows using the SCL band.
function maskS2sr(image) {
  var scl = image.select('SCL');
  // Remove clouds (9) and snow (11); keep shadows (8) if desired.
  var cloudMask = scl.neq(9).and(scl.neq(11));
  return image.updateMask(cloudMask);
}
/* --- Load and Prepare Sentinel-2 Data --- */
// Load Sentinel-2 Surface Reflectance collection, filtering by date and AOI.
var sentinel2Collection = ee.ImageCollection("COPERNICUS/S2_SR")
  .filterDate(startDate, endDate)
  .filterBounds(targetAOI);
print("Sentinel-2 Data (Rangpur):", sentinel2Collection);

function addNDVI(image, nirBand, redBand) {
  // Default assignments: NIR = B8, Red = B4.
  nirBand = (nirBand === undefined) ? 'B8' : nirBand;
  redBand = (redBand === undefined) ? 'B4' : redBand;
  
  var ndvi = image.normalizedDifference([nirBand, redBand]).rename('NDVI');
  return image.addBands(ndvi);
}

/* --- Process Sentinel-2 Collection for NDVI --- */
var sentinel2NDVI = sentinel2Collection
  .map(maskS2sr)
  .map(function(img) {
    // Scale the image (Sentinel-2 SR values are scaled by 10000)
    var scaled = img.divide(10000);
    // Compute NDVI and copy image properties.
    return addNDVI(scaled).copyProperties(img, img.propertyNames());
  })
  .select('NDVI');
print("Sentinel-2 NDVI Collection (Rangpur):", sentinel2NDVI);

/* --- Process the Reference Image for 2024 Data --- */
// Reproject the reference image to the target CRS.
var reprojected2024 = NBSI_SUGARCANE_2024_Rangpur.reproject({
  crs: targetCRS,
  scale: scale
});

/* --- Apply Threshold Mask to the Reprojected Image --- */
// Define threshold range for Rangpur 2024 data.
var threshold_2024_Rangpur = { lower: 0.00000347, upper: 0.00000543 };

var masked2024 = reprojected2024.updateMask(
  reprojected2024.gte(threshold_2024_Rangpur.lower)
    .and(reprojected2024.lte(threshold_2024_Rangpur.upper))
);
Map.addLayer(masked2024, { min: threshold_2024_Rangpur.lower, max: threshold_2024_Rangpur.upper, palette: ['green'] }, 'Masked Image (Rangpur 2024)');

/* --- Compute Pixel Count and Area for the Masked Reference Image --- */
var pixelCount2024 = masked2024.reduceRegion({
  reducer: ee.Reducer.count(),
  geometry: targetAOI,
  scale: scale,
  maxPixels: 1e13
});
  
// Each pixel covers 10m x 10m = 100 m².
var pixelAreaM2 = scale * scale;
var areaM2_2024 = ee.Number(pixelCount2024.get('b1')).multiply(pixelAreaM2);
var areaAcres_2024 = areaM2_2024.divide(4046.8564224);
print('Computed Area (acres) (Rangpur 2024):', areaAcres_2024);

/* --- Apply the Threshold Mask to the NDVI Collection --- */
// Extract the mask from the 2024 reference image and apply it to each NDVI image.
var rangpurThresholdMask = masked2024.mask();
var ndviMaskedCollection = sentinel2NDVI.map(function(image) {
  return image.updateMask(rangpurThresholdMask);
});

// Create a median composite for visualization.
var ndviComposite = ndviMaskedCollection.median();
Map.addLayer(ndviComposite, {}, "NDVI (Rangpur Threshold Mask)");
print("NDVI with Rangpur Threshold Mask:", ndviComposite);

/* --- Further Threshold NDVI (e.g., NDVI >= 0.3) --- */
var ndviThresholded = ndviComposite.updateMask(ndviComposite.gte(0.23));
Map.addLayer(ndviThresholded, {}, "NDVI (Rangpur Mask, NDVI >= 0.3)");



// Calculate NDVI Min and Max over AOI
var ndviStats = ndviThresholded.reduceRegion({
  reducer: ee.Reducer.minMax(),
  geometry: targetAOI,
  scale: 10,  // Sentinel-2 resolution
  bestEffort: true
});

print('NDVI Min and Max Rangpur 8 feb:', ndviStats);


 // Create an NDVI histogram
var histogram = ui.Chart.image.histogram({
  image: ndviThresholded,
  region: targetAOI,
  scale: 10, 
  maxPixels: 1e13
})
.setOptions({
  title: 'NDVI Histogram',
  hAxis: {title: 'NDVI Values'},
  vAxis: {title: 'Frequency'},
  colors: ['green']
});

print(histogram);

// Compute area for the Feb 8–13 composite.
var ndviPixelCount = ndviThresholded.reduceRegion({
  reducer: ee.Reducer.count(),
  geometry: targetAOI,
  scale: scale,
  maxPixels: 1e13
});
var areaM2NDVI = ee.Number(ndviPixelCount.get('NDVI')).multiply(pixelAreaM2);
var areaAcresNDVI = areaM2NDVI.divide(4046.8564224);
print("Computed Area (acres) for NDVI (>= 0.3) Feb 8–13 (Rangpur):", areaAcresNDVI);

/* --- New Block: Process Feb 14 Imagery --- */
// Define dates for Feb 13–14 imagery.
var feb13Date = '2025-02-13';
var feb14Date = '2025-02-14';

// Load Sentinel-2 imagery for Feb 14.
var sentinel2Feb14 = ee.ImageCollection("COPERNICUS/S2_SR")
  .filterDate(feb13Date, feb14Date)
  .filterBounds(targetAOI)
  .map(function(img) {
    var scaled = img.divide(10000);
    var masked = maskS2sr(scaled);
    return addNDVI(masked).copyProperties(img, img.propertyNames());
  })
  .select('NDVI');

// Create a composite (or pick the first image if only one is available) for Feb 14.
var ndviFeb14 = sentinel2Feb14.median();

// Calculate NDVI Min and Max over AOI
var ndviStats2 = ndviFeb14.reduceRegion({
  reducer: ee.Reducer.minMax(),
  geometry: targetAOI,
  scale: 10,  // Sentinel-2 resolution
  bestEffort: true
});

print('NDVI Min and Max ndviFeb14:', ndviStats2);
 
 
 
 // Create an NDVI histogram
var histogram = ui.Chart.image.histogram({
  image: ndviFeb14,
  region: targetAOI,
  scale: 10, 
  maxPixels: 1e13
})
.setOptions({
  title: 'NDVI Histogram',
  hAxis: {title: 'NDVI Values'},
  vAxis: {title: 'Frequency'},
  colors: ['green']
});

print(histogram);
 
 
 
 
 
 
 
 
 
 
 
 
// Apply the NDVI threshold for Feb 14 (NDVI >= 0.3).
var ndviFeb14Thresholded = ndviFeb14.updateMask(ndviFeb14.gte(0.21));
 
// Restrict analysis to the area defined by the baseline NDVI mask.
var feb14Masked = ndviFeb14Thresholded.updateMask(ndviThresholded.mask());
Map.addLayer(feb14Masked, {min: 0.3, max: 1, palette: ['yellow']}, 'NDVI (Rangpur Feb 14, NDVI>=0.3)');
 
// Compute area for Feb 14 thresholded pixels.
var pixelCountFeb14 = feb14Masked.reduceRegion({
  reducer: ee.Reducer.count(),
  geometry: targetAOI,
  scale: scale,
  maxPixels: 1e13
});
var areaM2Feb14 = ee.Number(pixelCountFeb14.get('NDVI')).multiply(pixelAreaM2);
var areaAcresFeb14 = areaM2Feb14.divide(4046.8564224);
print("Computed Area (acres) for NDVI (>= 0.3) Feb 14 (Rangpur):", areaAcresFeb14);
