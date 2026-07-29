const fs = require('fs');
const path = require('path');

// Read input PNG
const inputPath = path.join(__dirname, '../public/logoABMeD.png');
const outputPath = path.join(__dirname, '../public/logoABMeD_white_transparent.png');

// Check if file exists
if (!fs.existsSync(inputPath)) {
  console.error("Input file does not exist:", inputPath);
  process.exit(1);
}

console.log("Reading file:", inputPath);
