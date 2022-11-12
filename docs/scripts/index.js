var breadcrumb = require('./readFile')(hexo);

hexo.extend.helper.register('breadcrumb', breadcrumb, {async: true});