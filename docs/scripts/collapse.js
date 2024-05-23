'use strict';

hexo.extend.tag.register('collapse', collapse, {ends: true});

function collapse(args, content) {
  var title = args[0];

  return `
    <details class="collapse">
      <summary>
        ${title}
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" class="collapse-plus-icon"><path d="M7.25 0.25V13.75" stroke="#131522" stroke-width="2"/><path d="M14 7L0.5 7" stroke="#131522" stroke-width="2"/></svg>
        <svg width="14" height="2" viewBox="0 0 14 2" fill="none" xmlns="http://www.w3.org/2000/svg" class="collapse-minus-icon"><path d="M14 1L0.5 1" stroke="#131522" stroke-width="2"/></svg>
        </summary>
      <div class="collapse-content">
        ${hexo.render.renderSync({text: content, engine: 'markdown'}).split('\n').join('')}
      </div>
    </details>`;
}