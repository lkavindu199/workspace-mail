const fs = require('fs');
const path = require('path');

module.exports = async (context) => {
  const updateFilePath = path.join(context.appOutDir, 'Resources', 'app-update.yml');
  if (fs.existsSync(updateFilePath)) {
    fs.unlinkSync(updateFilePath);
  }
};
