// // Define Area of Interest (AOI)
// var AOI = Rangpur; // Replace 'Rangpur' with your specific AOI

// // Load Sentinel-2 Image Collection
// var s2 = ee.ImageCollection('COPERNICUS/S2')
//   .filterBounds(AOI) // Filter by AOI
//   .filterDate('2024-01-01', '2024-12-31') // Set date range
//   .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 10)) // Filter images with <10% cloud cover
//   .median(); // Compute median composite

// // Define Sentinel-2 band wavelengths (in nm)
// var lambdaN = 865;   // NIR (B8)
// var lambdaR = 665;   // Red (B4)
// var lambdaS1 = 1610; // SWIR-1 (B11)

// // Compute Floating Algae Index (FAI)
// var FAI = s2.expression(
//   'N - (R + (S1 - R) * ((lambdaN - lambdaR) / (lambdaS1 - lambdaR)))',
//   {
//     'N': s2.select('B8'),  // NIR
//     'R': s2.select('B4'),  // Red
//     'S1': s2.select('B11'), // SWIR-1
//     'lambdaN': lambdaN,
//     'lambdaR': lambdaR,
//     'lambdaS1': lambdaS1
//   }
// );

// // Visualize FAI result
// var visParams = {
//   min: -0.1,
//   max: 0.2,
//   palette: ['blue', 'white', 'green']
// };

// Map.centerObject(AOI, 10);
// Map.addLayer(FAI, visParams, 'Floating Algae Index');


// Function to mask clouds and scale reflectance
// Function to scale reflectance without cloud masking
function maskAndScale(image) {
    // Scale the image to reflectance (0-1)
    var scaled = image.divide(10000).clip(Rangpur);
    return scaled.select(['B8', 'B4', 'B11'])
                 .copyProperties(image, ['system:time_start']);
  }
  
  
  // Load and preprocess Sentinel-2 Surface Reflectance data
  var s2 = ee.ImageCollection('COPERNICUS/S2_SR')
      .filterBounds(Rangpur) // Replace with your geometry
      .filterDate('2023-01-01', '2023-12-31')
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 10)) // Filter images with less than 20% cloud cover
      .map(maskAndScale);
  
  print(s2, "the images in one year")
  // Function to calculate FAI
  var addFAI = function(image) {
    // Central wavelengths (nm) for Sentinel-2 bands
    var lambdaN = 832; // B8
    var lambdaR = 665; // B4
    var lambdaS1 = 1610; // B11
    
    var nir = image.select('B8');
    var red = image.select('B4');
    var swir1 = image.select('B11');
    
    
  Map.addLayer(Rangpur, '', "Rangpur");
  
    // Calculate adjustment factor
    var factor = (lambdaN - lambdaR) / (lambdaS1 - lambdaR);
    
    // Compute baseline reflectance
    var baseline = red.add(swir1.subtract(red).multiply(factor));
    
    // Calculate FAI and rename band
    var fai = nir.subtract(baseline).rename('FAI');
    
    return image.addBands(fai).clip(Rangpur);
  };
  
  // Apply FAI calculation to the image collection
  var s2WithFAI = s2.map(addFAI);
  
  // Visualization parameters
  var visParams = {
    bands: ['FAI'],
    min: -0.1,
    max: 0.1,
    palette: ['blue', 'white', 'green']
  };
  
  // 
  
  // Display the first image with FAI
  // Select first FAI image
  // Display the first image with FAI
  // Display the first image with FAI
  var firstImage = s2WithFAI.first().select('FAI');
  
  
  // Define export parameters
  Export.image.toDrive({
    image: firstImage,  // The FAI layer to export
    description: 'FAI_Layer_Rangpur',  // File name
    folder: 'GEE_Exports',  // Google Drive folder
    scale: 10,  // Resolution in meters (matches Sentinel-2)
    region: Rangpur,  // Define the area to export
    crs: 'EPSG:4326',  // Coordinate reference system
    maxPixels: 1e13  // Large limit to avoid export errors
  });
  Map.centerObject(Rangpur, 10);
  Map.addLayer(firstImage, visParams, 'FAI');
  
  // Add the FAI visualization separately
  Map.addLayer(firstImage.select('FAI'), visParams, 'FAI Layer');
  
  // Convert FAI image to a list of values
  var faiValues = firstImage.reduceRegion({
    reducer: ee.Reducer.toList(),
    geometry: Rangpur,
    scale: 10,
    maxPixels: 1e8
  }).get('FAI');
  
  // Ensure faiValues is an ee.List before using it
  faiValues = ee.List(faiValues);  // ✅ Convert to ee.List
  
  // Function to compute Natural Breaks (Jenks)
  var computeJenks = function(values, numClasses) {
    var sorted = values.sort(); // Sort values
    var count = sorted.length(); // Get total count
  
    // Compute class breaks using percentiles
    var breaks = ee.List.sequence(0, 100, 100 / numClasses)
        .map(function(p) {
          return sorted.reduce(ee.Reducer.percentile([p]));  // Keep in EE environment
        });
  
    return breaks;
  };
  
  // Compute natural breaks (e.g., 5 classes)
  var numClasses = 5;
  var naturalBreaks = computeJenks(faiValues, numClasses);
  
  // Print natural breaks
  print("Natural Breaks (Jenks) for FAI:", naturalBreaks);
  
  // ✅ Convert natural breaks to JavaScript numbers using .getInfo()
  var minBreak = ee.Number(naturalBreaks.get(0)).getInfo();  // Convert first break
  var maxBreak = ee.Number(naturalBreaks.get(numClasses - 1)).getInfo();  // Convert last break
  
  // Visualization parameters using the extracted natural breaks
  var faiVisParams2 = {
    bands: ['FAI'],
    min: minBreak,  // ✅ Extracted JavaScript number
    max: maxBreak,  // ✅ Extracted JavaScript number
    palette: ['blue', 'white', 'green']
  };
  
  // Add FAI Layer to the map using natural breaks
  Map.addLayer(firstImage, visParams, 'FAI with Natural Breaks');
  
  
  // Define natural break thresholds
  var thresholds = ee.List([
    -0.0263,  // Class 1
     0.0723,  // Class 2
     0.0918,  // Class 3
     0.1074,  // Class 4
     0.1347   // Class 5
  ]);
  
  // Function to classify FAI values into 5 categories
  var classifyFAI = function(image) {
    var fai = image.select('FAI');
  
    // Convert threshold values to images for pixel-wise comparison
    var T1 = ee.Image.constant(thresholds.get(0));
    var T2 = ee.Image.constant(thresholds.get(1));
    var T3 = ee.Image.constant(thresholds.get(2));
    var T4 = ee.Image.constant(thresholds.get(3));
  
    var classified = fai.where(fai.lte(T1), 1) // Class 1
                        .where(fai.gt(T1).and(fai.lte(T2)), 2) // Class 2
                        .where(fai.gt(T2).and(fai.lte(T3)), 3) // Class 3
                        .where(fai.gt(T3).and(fai.lte(T4)), 4) // Class 4
                        .where(fai.gt(T4), 5) // Class 5
                        .rename('FAI_Class');
  
    return image.addBands(classified);
  };
  
  // Apply classification to the FAI image collection
  var s2WithFAI_Classes = s2WithFAI.map(classifyFAI);
  
  // Select first image for visualization
  var firstImageClassified = s2WithFAI_Classes.first().select('FAI_Class');
  
  // Visualization parameters for the classified image
  var classVisParams = {
    min: 1,
    max: 5,
    palette: ['blue', 'cyan', 'yellow', 'orange', 'red'] // Color mapping for classes
  };
  
  // Add the classified FAI image to the map
  Map.addLayer(firstImageClassified, classVisParams, 'FAI Classified (5 Classes)');
  