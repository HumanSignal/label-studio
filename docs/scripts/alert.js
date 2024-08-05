const sanityClient = require('@sanity/client');
const fs = require('hexo-fs');
require('dotenv').config()

const client = sanityClient({
  projectId: 'k7elabj6',
  dataset: 'production',
  useCdn: false,
  token: process.env.SANITY_TOKEN,
  apiVersion: '2024-01-01',
  perspective: "published"
});

hexo.extend.filter.register('after_init', async function(){

  const query = `*[_type == "alert" && !(_id in path('drafts.**'))][0]`;
  const alert = await client.fetch(query);

  if(alert.docsUrl) {
    const template = `
      <a href="${alert.docsUrl}" class="Alert">
        <span class="AlertContent">
          ${alert.docsBadge && `<span class="Badge">${alert.docsBadge}</span>`}
          <span class="AlertText">${alert.docsText}</span>
          <svg fill="currentColor" viewBox="0 0 14 12"><path fill-rule="evenodd" d="m8.792.119 4.866 5.654-4.866 5.654-.948-.816 3.627-4.213H.54v-1.25h10.93L7.844.934l.948-.815Z" clip-rule="evenodd"></path></svg>
        </span>
      </a>`

    fs.writeFile("themes/v2/layout/partials/alert.ejs", template, (err) => {
      console.log(err);
    });
  }

  if(alert.humanSignalDocsUrl) {
    const template = `
      <a href="${alert.humanSignalDocsUrl}" class="Alert">
        <span class="AlertContent">
          ${alert.humanSignalDocsBadge && `<span class="Badge">${alert.humanSignalDocsBadge}</span>`}
          <span class="AlertText">${alert.humanSignalDocsText}</span>
          <svg fill="currentColor" viewBox="0 0 14 12"><path fill-rule="evenodd" d="m8.792.119 4.866 5.654-4.866 5.654-.948-.816 3.627-4.213H.54v-1.25h10.93L7.844.934l.948-.815Z" clip-rule="evenodd"></path></svg>
        </span>
      </a>`

    fs.writeFile("themes/v2/layout/partials/alert-enterprise.ejs", template, (err) => {
      console.log(err);
    });
  }
});
