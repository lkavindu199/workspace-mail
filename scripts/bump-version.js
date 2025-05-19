const fs = require('fs');
const path = require('path');

function updateVersion() {
  const packageJsonPath = path.join(__dirname, '../package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  // Get version from GitHub tag or use current version
  const tagVersion = process.env.GITHUB_REF?.replace(/^refs\/tags\/v?/, '');
  const newVersion = tagVersion || packageJson.version;

  // Generate build number (timestamp)
  const buildNumber = Math.floor(Date.now() / 1000).toString();

  // Update package.json
  packageJson.version = newVersion;
  packageJson.build = packageJson.build || {};
  packageJson.build.extraMetadata = packageJson.build.extraMetadata || {};
  packageJson.build.extraMetadata.buildNumber = buildNumber;

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

  console.log(`Updated version to ${newVersion} with build number ${buildNumber}`);
  return { version: newVersion, buildNumber };
}

// Export for testing purposes
if (require.main === module) {
  updateVersion();
}

module.exports = { updateVersion };
