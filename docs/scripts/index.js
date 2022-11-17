var breadcrumb = require('./breadcrumb')(hexo);
var pageToc = require('./pageToc')(hexo);

hexo.extend.helper.register('breadcrumb', breadcrumb, {async: true});
hexo.extend.helper.register('pageToc', pageToc);