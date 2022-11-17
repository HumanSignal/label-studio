var HTMLParser = require('node-html-parser');

module.exports = function(ctx) {

  return function pageToc(content) {

    const pageContent = HTMLParser.parse(content);
    const headings = pageContent.querySelectorAll("h2");

    const links = headings.map(heading => {
      const label = heading.childNodes[1]._rawText;
      const enterpriseOnly = heading.parentNode.classList.contains("enterprise-only")
      return `<li class="${enterpriseOnly ? "enterprise-only" : ""}"><a href="#${heading.id}">${label}</a></li>`;
    })

    return `
      <ol class="toc-list">
        ${links.join(" ")}
      </ol>
    `
  };
};