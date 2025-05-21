const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

function createSymlinks(version, buildNumber, architectures) {
  const artifactsDir = path.join(__dirname, '../dist');
  const latestYmlPath = path.join(artifactsDir, 'latest-mac.yml');

  try {
    let latestYml = {};
    if (fs.existsSync(latestYmlPath)) {
      latestYml = yaml.load(fs.readFileSync(latestYmlPath, 'utf8'));
    }

    latestYml.version = version;
    latestYml.files = latestYml.files || [];

    architectures.forEach(arch => {
      // Handle DMG files
      const dmgFilename = `workspace-mail-${version}-${buildNumber}-${arch}-setup.dmg`;
      const dmgPath = path.join(artifactsDir, dmgFilename);
      const latestDmgFilename = `latest-mac-${arch}.dmg`;
      const latestDmgPath = path.join(artifactsDir, latestDmgFilename);

      if (fs.existsSync(dmgPath)) {
        if (fs.existsSync(latestDmgPath)) {
          fs.unlinkSync(latestDmgPath);
        }
        fs.copyFileSync(dmgPath, latestDmgPath);
        console.log(`Created latest DMG for ${arch}: ${latestDmgFilename}`);

        const existingDmgIndex = latestYml.files.findIndex(f => f.url.includes(`-${arch}-setup.dmg`));
        if (existingDmgIndex >= 0) {
          latestYml.files[existingDmgIndex] = {
            url: dmgFilename,
            sha512: getFileHash(dmgPath),
            size: fs.statSync(dmgPath).size
          };
        } else {
          latestYml.files.push({
            url: dmgFilename,
            sha512: getFileHash(dmgPath),
            size: fs.statSync(dmgPath).size
          });
        }
      }

      const zipFilename = `workspace-mail-${version}-${buildNumber}-${arch}-setup.zip`;
      const zipPath = path.join(artifactsDir, zipFilename);

      if (fs.existsSync(zipPath)) {
        const existingZipIndex = latestYml.files.findIndex(f => f.url.includes(`-${arch}-setup.zip`));
        if (existingZipIndex >= 0) {
          latestYml.files[existingZipIndex] = {
            url: zipFilename,
            sha512: getFileHash(zipPath),
            size: fs.statSync(zipPath).size
          };
        } else {
          latestYml.files.push({
            url: zipFilename,
            sha512: getFileHash(zipPath),
            size: fs.statSync(zipPath).size
          });
        }

        if (arch === 'arm64') {
          latestYml.path = zipFilename;
          latestYml.sha512 = getFileHash(zipPath);
          latestYml.size = fs.statSync(zipPath).size;
        }
      }
    });

    latestYml.releaseDate = new Date().toISOString();

    fs.writeFileSync(latestYmlPath, yaml.dump(latestYml));
    console.log(`Updated ${latestYmlPath} with version ${version}`);

    const universalLatestPath = path.join(artifactsDir, 'latest-mac.dmg');
    const primaryArch = architectures.includes('arm64') ? 'arm64' : 'x64';
    const primaryDmg = path.join(artifactsDir, `latest-mac-${primaryArch}.dmg`);

    if (fs.existsSync(primaryDmg)) {
      if (fs.existsSync(universalLatestPath)) {
        fs.unlinkSync(universalLatestPath);
      }
      fs.copyFileSync(primaryDmg, universalLatestPath);
      console.log(`Created universal latest-mac.dmg from ${primaryArch} build`);
    }

  } catch (err) {
    console.error('Error in createSymlinks:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  const { version, buildNumber, architectures } = require('./bump-version').updateVersion();
  createSymlinks(version, buildNumber, architectures);
}

module.exports = createSymlinks;
