/* eslint-disable react/jsx-no-target-blank */
import React from 'react';

import { htmlEscape } from './html';

const URL_CORS_DOCS = 'https://labelstud.io/guide/storage.html#Troubleshoot-CORS-and-access-problems';
const URL_TAGS_DOCS = 'https://labelstud.io/tags';

export default {
  DONE: 'Done!',
  NO_COMP_LEFT: 'No more annotations',
  NO_NEXT_TASK: 'No More Tasks Left in Queue',
  NO_ACCESS: 'You don\'t have access to this task',

  CONFIRM_TO_DELETE_ALL_REGIONS: 'Please confirm you want to delete all labeled regions',

  // Tree validation messages
  ERR_REQUIRED: ({ modelName, field }) => {
    return `Attribute <b>${field}</b> is required for <b>${modelName}</b>`;
  },

  ERR_UNKNOWN_TAG: ({ modelName, field, value }) => {
    return `Tag with name <b>${value}</b> is not registered. Referenced by <b>${modelName}#${field}</b>.`;
  },

  ERR_TAG_NOT_FOUND: ({ modelName, field, value }) => {
    return `Tag with name <b>${value}</b> does not exist in the config. Referenced by <b>${modelName}#${field}</b>.`;
  },

  ERR_TAG_UNSUPPORTED: ({ modelName, field, value, validType }) => {
    return `Invalid attribute <b>${field}</b> for <b>${modelName}</b>: referenced tag is <b>${value}</b>, but <b>${modelName}</b> can only control <b>${[]
      .concat(validType)
      .join(', ')}</b>`;
  },

  ERR_PARENT_TAG_UNEXPECTED: ({ validType, value }) => {
    return `Tag <b>${value}</b> must be a child of one of the tags <b>${[].concat(validType).join(', ')}</b>.`;
  },

  ERR_BAD_TYPE: ({ modelName, field, validType }) => {
    return `Attribute <b>${field}</b> of tag <b>${modelName}</b> has invalid type. Valid types are: <b>${validType}</b>.`;
  },

  ERR_INTERNAL: ({ value }) => {
    return `Internal error. See browser console for more info. Try again or contact developers.<br/>${value}`;
  },

  ERR_GENERAL: ({ value }) => {
    return value;
  },

  // Object loading errors
  URL_CORS_DOCS,
  URL_TAGS_DOCS,

  ERR_LOADING_AUDIO({ attr, url, error }) {
    return (
      <div data-testid="error:audio">
        <p>Error while loading audio. Check <code>{attr}</code> field in task.</p>
        <p>Technical description: {error}</p>
        <p>URL: {htmlEscape(url)}</p>
      </div>
    );
  },

  ERR_LOADING_S3({ attr, url }) {
    return `
    <div>
      <p>
        There was an issue loading URL from <code>${attr}</code> value.
        The request parameters are invalid.
        If you are using S3, make sure you’ve specified the right bucket region name.
      </p>
      <p>URL: <code><a href="${encodeURI(url)}" target="_blank">${htmlEscape(url)}</a></code></p>
    </div>`;
  },

  ERR_LOADING_CORS({ attr, url }) {
    return `
    <div>
      <p>
        There was an issue loading URL from <code>${attr}</code> value.
        Most likely that's because static server has wide-open CORS.
        <a href="${this.URL_CORS_DOCS}" target="_blank">Read more on that here.</a>
      </p>
      <p>
        Also check that:
        <ul>
          <li>URL is valid</li>
          <li>Network is reachable</li>
        </ul>
      </p>
      <p>URL: <code><a href="${encodeURI(url)}" target="_blank">${htmlEscape(url)}</a></code></p>
    </div>`;
  },

  ERR_LOADING_HTTP({ attr, url, error }) {
    return `
    <div data-testid="error:http">
      <p>
        There was an issue loading URL from <code>${attr}</code> value
      </p>
      <p>
        Things to look out for:
        <ul>
          <li>URL is valid</li>
          <li>URL scheme matches the service scheme, i.e. https and https</li>
          <li>
            The static server has wide-open CORS,
            <a href=${this.URL_CORS_DOCS} target="_blank">more on that here</a>
          </li>
        </ul>
      </p>
      <p>
        Technical description: <code>${error}</code>
        <br />
        URL: <code><a href="${encodeURI(url)}" target="_blank">${htmlEscape(url)}</a></code>
      </p>
    </div>`;
  },
};
