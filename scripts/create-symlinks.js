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
        fs.symlinkSync(originalFilename, latestPath);
        console.log(`Created symlink: ${latestFilename} -> ${originalFilename}`);
      } catch (err) {
        console.error(`Error creating symlink for ${arch}:`, err);
      }
    } else {
      console.warn(`Original file not found: ${originalFilename}`);
    }
  });
}

if (require.main === module) {
  const { updateVersion } = require('./bump-version');
  const { version, buildNumber, architectures } = updateVersion();
  createSymlinks(version, buildNumber, architectures || ['x64', 'arm64']);
}

module.exports = createSymlinks;
