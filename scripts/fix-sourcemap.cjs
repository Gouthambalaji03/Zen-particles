const fs = require('fs');
const path = require('path');

// Create dummy source map for MediaPipe to suppress warnings
const sourceMapPath = path.join(
  __dirname,
  '..',
  'node_modules',
  '@mediapipe',
  'tasks-vision',
  'vision_bundle_mjs.js.map'
);

const dummySourceMap = {
  version: 3,
  sources: [],
  names: [],
  mappings: '',
  file: 'vision_bundle.mjs'
};

try {
  fs.writeFileSync(sourceMapPath, JSON.stringify(dummySourceMap));
  console.log('Fixed MediaPipe source map');
} catch (error) {
  // Silently fail if the file can't be created
}
