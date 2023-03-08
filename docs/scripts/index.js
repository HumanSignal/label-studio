var breadcrumb = require('./breadcrumb')(hexo);

hexo.extend.helper.register('breadcrumb', breadcrumb, {async: true});
