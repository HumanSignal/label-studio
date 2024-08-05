const fs = require('fs');
const path = require('path');

hexo.extend.helper.register('file_exists', function(filePath) {
  const fullPath = path.join(hexo.theme_dir, 'layout', filePath);
  return fs.existsSync(fullPath);
});
