const fs = require('fs');
const path = require('path');

function updateVersion() {
  const packageJsonPath = path.join(__dirname, '../package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  const tagVersion = process.env.GITHUB_REF?.replace(/^refs\/tags\/v?/, '');
  const newVersion = tagVersion || packageJson.version;

  const githubRunNumber = process.env.GITHUB_RUN_NUMBER;

  const currentBuildNumber = parseInt(
    packageJson?.build?.extraMetadata?.buildNumber || '0',
    10
  );

  const buildNumber = githubRunNumber
    ? githubRunNumber.toString()
    : (currentBuildNumber + 1).toString();

  packageJson.version = newVersion;
  packageJson.build = packageJson.build || {};
  packageJson.build.extraMetadata = packageJson.build.extraMetadata || {};
  packageJson.build.extraMetadata.buildNumber = buildNumber;

  const winArtifactName = `workspace-mail-${newVersion}-${buildNumber}.\${ext}`;
  const macArtifactName = `workspace-mail-${newVersion}-${buildNumber}-\${arch}.\${ext}`;
  const linuxArtifactName = `workspace-mail-${newVersion}-${buildNumber}.\${ext}`;

  packageJson.build.win = packageJson.build.win || {};
  packageJson.build.mac = packageJson.build.mac || {};
  packageJson.build.linux = packageJson.build.linux || {};

  packageJson.build.win.artifactName = winArtifactName;
  packageJson.build.mac.artifactName = macArtifactName;
  packageJson.build.linux.artifactName = linuxArtifactName;

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

  console.log(`Updated version to ${newVersion} with build number ${buildNumber}`);
  return { version: newVersion, buildNumber, architectures: ['x64', 'arm64'] };
}

if (require.main === module) {
  updateVersion();
}

module.exports = { updateVersion };
