const fetch = require('node-fetch');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const processedImagesPath = path.join(__dirname, '../public/processed_images');
if (!fs.existsSync(processedImagesPath)) {
  fs.mkdirSync(processedImagesPath);
}

const gradientImagePath = './bg-gradient.png'; // Path to your gradient image

async function processImage(day) {
  const imageUrl = `https://basepaint.xyz/api/art/image?day=${day}`;

  try {
    const response = await fetch(imageUrl);
    const imageBuffer = await response.buffer();

    // Processed image path
    const processedImagePath = path.join(processedImagesPath, `${day}.png`);

    // Get metadata for calculation
    let metadata = await sharp(imageBuffer).metadata();
    const aspectRatio = metadata.width / metadata.height;

    // Calculate dimensions for centered image
    const maxImageWidth = 600; // Max width for the centered image, adjust as needed
    const imageResizeHeight = Math.round(maxImageWidth / aspectRatio);
    const centeredImageBuffer = await sharp(imageBuffer)
      .resize(maxImageWidth, imageResizeHeight) // Resize maintaining aspect ratio
      .toBuffer();

    const targetHeight = Math.round(1200 / aspectRatio);

    // Resize, blur, and crop the background image
    const resizedImageBuffer = await sharp(imageBuffer)
      .resize(1200, targetHeight) // Resize maintaining aspect ratio
      .blur(8) // Apply blur
      .extract({ left: 0, top: Math.max(0, (targetHeight - 630) / 2), width: 1200, height: 630 }) // Crop vertically to 630px
      .toBuffer();

    // Composite the gradient and centered image over the blurred background
    await sharp(resizedImageBuffer)
      .composite([
        { input: gradientImagePath, blend: 'over' },
        { 
          input: centeredImageBuffer, 
          blend: 'over', 
          top: Math.round((630 - imageResizeHeight) / 2), // Center vertically
          left: Math.round((1200 - maxImageWidth) / 2) // Center horizontally
        }
      ])
      .png({
        quality: 80,
        compressionLevel: 9,
        palette: true
      })
      .toFile(processedImagePath);

    console.log(`Processed image for day ${day}`);
  } catch (error) {
    console.error(`Failed to process image for day ${day}:`, error);
  }
}

const currentDate = new Date();
const targetDate = new Date("2023-08-10");
const oneDay = 24 * 60 * 60 * 1000;

const daysSinceTargetDate = Math.round(Math.abs((currentDate - targetDate) / oneDay));

// Ensure the processed_images directory exists before starting
if (!fs.existsSync(processedImagesPath)) {
  fs.mkdirSync(processedImagesPath, { recursive: true });
}

processImage(daysSinceTargetDate);