const fs = require('fs');
const path = require('path');

function createSymlinks(version, buildNumber, architectures) {
  const artifactsDir = path.join(__dirname, '../dist');

  architectures.forEach(arch => {
    const originalFilename = `workspace-mail-${version}-${buildNumber}-${arch}-setup.dmg`;
    const latestFilename = `latest-${arch}.dmg`;

    const originalPath = path.join(artifactsDir, originalFilename);
    const latestPath = path.join(artifactsDir, latestFilename);

    if (fs.existsSync(originalPath)) {
      try {
        if (fs.existsSync(latestPath)) {
          fs.unlinkSync(latestPath);
        }
        fs.copyFileSync(originalPath, latestPath);
        console.log(`Created latest copy: ${latestFilename}`);
      } catch (err) {
        console.error(`Error creating latest copy for ${arch}:`, err);
      }
    } else {
      console.warn(`Original DMG not found: ${originalFilename}`);
    }
  });

  architectures.forEach(arch => {
    const zipFile = path.join(artifactsDir, `workspace-mail-${version}-${buildNumber}-${arch}-setup.zip`);
    if (fs.existsSync(zipFile)) {
      fs.unlinkSync(zipFile);
      console.log(`Removed ZIP file: ${zipFile}`);
    }
  });
}


if (require.main === module) {
  const { version, buildNumber } = require('./bump-version')();
  createSymlinks(version, buildNumber);
}

module.exports = createSymlinks;
