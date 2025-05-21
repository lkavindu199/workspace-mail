const fs = require('fs');
const path = require('path');

function createSymlinks(version, buildNumber, architectures) {
  const artifactsDir = path.join(__dirname, '../dist');

  // Create latest DMG copies for each architecture
  architectures.forEach(arch => {
    const originalFilename = `workspace-mail-${version}-${buildNumber}-${arch}-setup.dmg`;
    const latestFilename = `latest-mac-${arch}.dmg`;

    const originalPath = path.join(artifactsDir, originalFilename);
    const latestPath = path.join(artifactsDir, latestFilename);

    if (fs.existsSync(originalPath)) {
      try {
        if (fs.existsSync(latestPath)) {
          fs.unlinkSync(latestPath);
        }
        fs.copyFileSync(originalPath, latestPath);
        console.log(`Created latest copy for ${arch}: ${latestFilename}`);
      } catch (err) {
        console.error(`Error creating latest copy for ${arch}:`, err);
      }
    } else {
      console.warn(`Original DMG not found for ${arch}: ${originalFilename}`);
    }
  });

  // Create universal latest-mac.dmg if both architectures exist
  const x64Path = path.join(artifactsDir, `latest-mac-x64.dmg`);
  const arm64Path = path.join(artifactsDir, `latest-mac-arm64.dmg`);
  const universalLatestPath = path.join(artifactsDir, 'latest-mac.dmg');

  if (fs.existsSync(x64Path) && fs.existsSync(arm64Path)) {
    try {
      if (fs.existsSync(universalLatestPath)) {
        fs.unlinkSync(universalLatestPath);
      }
      // Copy x64 version as the universal one (or you could implement merging logic)
      fs.copyFileSync(x64Path, universalLatestPath);
      console.log(`Created universal latest-mac.dmg`);
    } catch (err) {
      console.error('Error creating universal latest-mac.dmg:', err);
    }
  }

  // Remove ZIP files if they exist
  architectures.forEach(arch => {
    const zipFile = path.join(artifactsDir, `workspace-mail-${version}-${buildNumber}-${arch}-setup.zip`);
    if (fs.existsSync(zipFile)) {
      fs.unlinkSync(zipFile);
      console.log(`Removed ZIP file: ${zipFile}`);
    }
  });
}

if (require.main === module) {
  const { version, buildNumber, architectures } = require('./bump-version').updateVersion();
  createSymlinks(version, buildNumber, architectures);
}

module.exports = createSymlinks;
