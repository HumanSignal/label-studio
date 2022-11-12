var pathFn = require('path');
var fs = require('hexo-fs');
var fm = require('front-matter')

module.exports = function(ctx) {
  return function includeTag({pageType, parentPage, currentPage}) {
    const parentFile = `${pageType}/${parentPage}.md`;
    var path = pathFn.join(ctx.source_dir, parentFile);

    // exit if path is not defined
    if (!path) {
      console.warn("Include file path undefined.");
      return;
    }

    console.log(path);

    const data = fs.readFileSync(path);
    const frontmatter = fm(data)

    return `<a href="/${pageType}/${parentPage}.html">${frontmatter.attributes.short || frontmatter.attributes.title}</a>
    ${currentPage}`

    // check existence, if it does, check there is content, return content
    /* return fs.exists(path).then(function(exist) {
      if (!exist) {
        console.warn('Include file not found.');
        return;
      }
      return fs.readFileSync(path).then(function(contents) {
        if (!contents) {
          console.warn('Include file empty.');
          return;
        }
        return contents;
      });
    }); */
  };
};