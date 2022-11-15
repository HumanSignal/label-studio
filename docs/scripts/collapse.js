'use strict';

hexo.extend.tag.register('collapse', collapse, {ends: true});

function collapse(args, content) {
  var title = args[0];

  return `
    <details>
      <summary>${title}</summary>
      <div style="padding: 0 18px">
      <p>${hexo.render.renderSync({text: content, engine: 'markdown'}).split('\n').join('')}</p>
      </div>
    </details>`;
}