var pathFn = require('path');
var fs = require('hexo-fs');
var fm = require('front-matter')

module.exports = function(ctx) {
  return function includeTag({pageType, parentPage, currentPage, parentPageExtension = "md"}) {
    const parentFile = `${pageType}/${parentPage}.${parentPageExtension}`;
    var path = pathFn.join(ctx.source_dir, parentFile);

    // exit if path is not defined
    if (!path) {
      console.warn("Include file path undefined.");
      return;
    }

    const data = fs.readFileSync(path);
    const frontmatter = fm(data)

    return `
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="/${pageType}/${parentPage}.html">${frontmatter.attributes.short || frontmatter.attributes.title}</a>
        <svg width="6" height="9" viewBox="0 0 6 9" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 8.5L5 4.5L1 0.5" stroke="#646676"/>
        </svg>
        <span>${currentPage}</span>
      </nav>
    `
  };
};
