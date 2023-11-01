/**
 * Load custom example
 * @param {object} params
 * @param {string} params.config
 * @param {object} params.data object with property used in config
 * @param {object[]} params.annotations
 * @param {object[]} params.predictions
 */
async function initLabelStudio({
  config,
  data,
  annotations = [{ result: [] }],
  predictions = [],
  settings = {},
  additionalInterfaces = [],
  params = {},
}) {
  if (window.Konva && window.Konva.stages.length) window.Konva.stages.forEach(stage => stage.destroy());

  const interfaces = [
    'panel',
    'update',
    'submit',
    'controls',
    'side-column',
    'topbar',
    'annotations:history',
    'annotations:current',
    'annotations:tabs',
    'annotations:menu',
    'annotations:add-new',
    'annotations:delete',
    'predictions:tabs',
    'predictions:menu',
    'edit-history',
    ...additionalInterfaces,
  ];
  const task = { data, annotations, predictions };

  window.LabelStudio.destroyAll();
  window.labelStudio = new window.LabelStudio('label-studio', { interfaces, config, task, settings, ...params });
}

const createMethodInjectionIntoScript = (fnName, fn) => {
  const args = (new Array(fn.length)).fill().map((v, idx) => {
    return `v${idx}`;
  }).join(', ');
  let fnBody = fn.toString();

  if ((/^(?:(?!function)(?!async)[a-zA-Z])+/).test(fnBody)) {
    fnBody = `function ${fnBody}`;
  }
  return (
    `${fnName}(${args}) {
  return (${fnBody})(${args});
}`);
};

const FN_PREFIX = 'fn_';
const prepareInitialParams = (value, prefix = FN_PREFIX) => {
  if (Array.isArray(value)) {
    const result = [];
    let functions = [];

    value.forEach((val, key) => {
      const [resParam, resFns] = prepareInitialParams(val, `${prefix}_${key}`);

      result.push(resParam);
      functions = [...functions, ...resFns];
    });
    return [result, functions];
  }
  if (typeof value === 'object') {
    const result = {};
    let functions = [];

    Object.keys(value).forEach(key => {
      const param = value[key];
      const [resParam, resFns] = prepareInitialParams(param, `${prefix}_${key}`);

      result[key] = resParam;
      functions = [...functions, ...resFns];
    });
    return [result, functions];
  }
  if (typeof value === 'function') {
    const injection = createMethodInjectionIntoScript(prefix, value);

    return [prefix, [injection]];
  }
  return [value, []];
};

const createLabelStudioInitFunction = (params) => {
  const [preparedParams, fns] = prepareInitialParams(params);

  return new Function('', `
function linkFunctions(value) {
 if (Array.isArray(value)) {
    return value.map(val => linkFunctions(val));
 }
 if (typeof value === "object") {
   const result = {};
   Object.keys(value).forEach(key => {
       result[key] = linkFunctions(value[key])
   })
   return result;
 }
 if (typeof value === "string" && value.startsWith("fn_")) {
   return fns[value];
 }
 return value;
}
function ${createMethodInjectionIntoScript('initLabelStudio', initLabelStudio)}
const fns = {${fns.join(',')}};
const params = ${JSON.stringify(preparedParams)};
initLabelStudio(linkFunctions(params));
`);
};

const setFeatureFlagsDefaultValue = (value) => {
  if (!window.APP_SETTINGS) window.APP_SETTINGS = {};
  window.APP_SETTINGS.feature_flags_default_value = value;
  return window.APP_SETTINGS.feature_flags_default_value;
};

const setFeatureFlags = (featureFlags) => {
  if (!window.APP_SETTINGS) window.APP_SETTINGS = {};
  if (!window.APP_SETTINGS.feature_flags) window.APP_SETTINGS.feature_flags = {};
  window.APP_SETTINGS.feature_flags = {
    ...window.APP_SETTINGS.feature_flags,
    ...featureFlags,
  };
  return window.APP_SETTINGS.feature_flags;
};

const hasFF = (fflag) => {
  if (!window.APP_SETTINGS || !window.APP_SETTINGS.feature_flags) return true;

  return window.APP_SETTINGS.feature_flags[fflag] === true;
};

const createAddEventListenerScript = (eventName, callback) => {
  const args = (new Array(callback.length)).fill().map((v, idx) => {
    return `v${idx}`;
  }).join(', ');

  return new Function('', `
    function ${eventName}(${args}) {
      return (${callback.toString()})(${args});
    }
    window.labelStudio.on("${eventName}",${eventName});
`);
};

/**
 * Wait for the main Image object to be loaded
 */
const waitForImage = () => {
  return new Promise((resolve) => {
    const img = document.querySelector('[alt=LS]');

    if (!img || img.complete) return resolve();
    // this should be rewritten to isReady when it is ready
    img.onload = () => {
      setTimeout(resolve, 100);
    };
  });
};

/**
 * Wait for all audio on the page to be loaded
 */
const waitForAudio = async () => {
  const audios = document.querySelectorAll('audio');

  await Promise.all(
    [...audios].map(audio => {
      if (audio.readyState === 4) return Promise.resolve(true);
      return new Promise(resolve => {
        audio.addEventListener('durationchange', () => {
          resolve(true);
        });
      });
    }),
  );
};


/**
 * Wait for objects ready
 */
const waitForObjectsReady = async () => {
  await new Promise(resolve => {
    const watchObjectsReady = () => {
      const isReady = window.Htx.annotationStore.selected.objects.every(object => object.isReady);

      if (isReady) {
        resolve(true);
      } else {
        setTimeout(watchObjectsReady, 16);
      }
    };

    watchObjectsReady();
  });
};

/**
 * Get the metadata of media type element(s)
 */
const getCurrentMedia = (type) => {
  const media = document.querySelectorAll(type);

  return [...media].map(m => ({
    currentTime: m.currentTime,
    duration: m.duration,
    playbackRate: m.playbackRate,
    paused: m.paused,
    muted: m.muted,
    volume: m.volume,
    src: m.src,
  }));
};

/**
 * Float numbers can't be compared strictly, so convert any numbers or structures with numbers
 * to same structures but with rounded numbers (int for ints, fixed(2) for floats)
 * @param {*} data
 */
const convertToFixed = (data, fractionDigits = 2) => {
  if (['string', 'number'].includes(typeof data)) {
    const n = Number(data);

    return Number.isNaN(n) ? data : Number.isInteger(n) ? n : +Number(n).toFixed(fractionDigits);
  }
  if (Array.isArray(data)) {
    return data.map(n => convertToFixed(n, fractionDigits));
  }
  if (typeof data === 'object') {
    const result = {};

    for (const key in data) {
      result[key] = convertToFixed(data[key], fractionDigits);
    }
    return result;
  }
  return data;
};

/**
 * Create convertor for any measures to relative form on image with given dimensions
 * Accepts numbers, arrays ([x, y] treated as a special coords array) and hash objects
 * With [706, 882] given as image sizes:
 *   assert.equal(convertToImageSize(123), 17.42);
 *   assert.deepEqual(convertToImageSize([123, 123]), [17.42, 13.95]);
 *   assert.deepEqual(
 *     convertToImageSize({ width: 123, height: 123, radiusY: 123, coords: [123, 123] }),
 *     { width: 17.42, height: 13.95, radiusY: 13.95, coords: [17.42, 13.95] }
 *   );
 * @param {number} width
 * @param {number} height
 */
const getSizeConvertor = (width, height) =>
  function convert(data, size = width) {
    if (typeof data === 'number') return convertToFixed((data * 100) / size);
    if (Array.isArray(data)) {
      if (data.length === 2) return [convert(data[0]), convert(data[1], height)];
      return data.map(n => convert(n));
    }
    if (typeof data === 'object') {
      const result = {};

      for (const key in data) {
        if (key === 'rotation') result[key] = data[key];
        else if (key.startsWith('height') || key === 'y' || key.endsWith('Y')) result[key] = convert(data[key], height);
        else result[key] = convert(data[key]);
      }
      return result;
    }
    return data;
  };

const delay = n => new Promise(resolve => setTimeout(resolve, n));

// good idea, but it doesn't work :(
const emulateClick = source => {
  const event = document.createEvent('CustomEvent');

  event.initCustomEvent('click', true, true, null);
  event.clientX = source.getBoundingClientRect().top / 2;
  event.clientY = source.getBoundingClientRect().left / 2;
  source.dispatchEvent(event);
};

const emulateKeypress = (params) => {
  document.activeElement.dispatchEvent(
    new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      ...params,
    }),
  );
  document.activeElement.dispatchEvent(
    new KeyboardEvent('keyup', {
      bubbles: true,
      cancelable: true,
      ...params,
    }),
  );
};



// click the Rect on the Konva canvas
const clickRect = () => {
  const rect = window.Konva.stages[0].findOne('Rect');

  rect.fire('click', { clientX: 10, clientY: 10 });
};

/**
 * Click once on the main Stage
 * @param {[number, number]} coords
 */
const clickKonva = ([x, y]) => {
  const stage = window.Konva.stages[0];

  stage.fire('click', { clientX: x, clientY: y, evt: { offsetX: x, offsetY: y, timeStamp: Date.now() } });
};

/**
 * Click multiple times on the Stage
 * @param {number[][]} points array of coords arrays ([[x1, y1], [x2, y2], ...])
 */
const clickMultipleKonva = async (points) => {
  const stage = window.Konva.stages[0];
  const delay = (timeout = 0) => new Promise(resolve => setTimeout(resolve, timeout));
  let lastPoint;

  for (const point of points) {
    if (lastPoint) {
      stage.fire('mousemove', { evt: { offsetX: point[0], offsetY: point[1], timeStamp: Date.now() } });
      await delay();
    }
    stage.fire('mousedown', { evt: { offsetX: point[0], offsetY: point[1], timeStamp: Date.now() } });
    await delay();
    stage.fire('mouseup', { evt: { offsetX: point[0], offsetY: point[1], timeStamp: Date.now() } });
    await delay();
    stage.fire('click', { evt: { offsetX: point[0], offsetY: point[1], timeStamp: Date.now() } });
    lastPoint = point;
    await delay();
  }
};

/**
 * Create Polygon on Stage by clicking multiple times and click on the first point at the end
 * @param {number[][]} points array of coords arrays ([[x1, y1], [x2, y2], ...])
 */
const polygonKonva = async (points) => {
  try {
    const delay = (timeout = 0) => new Promise(resolve => setTimeout(resolve, timeout));
    const stage = window.Konva.stages[0];

    for (const point of points) {
      stage.fire('mousedown', {
        evt: { offsetX: point[0], offsetY: point[1], timeStamp: Date.now(), preventDefault: () => {} },
      });
      stage.fire('click', {
        evt: { offsetX: point[0], offsetY: point[1], timeStamp: Date.now(), preventDefault: () => {} },
      });
      stage.fire('mouseup', {
        evt: { offsetX: point[0], offsetY: point[1], timeStamp: Date.now(), preventDefault: () => {} },
      });
      await delay(50);
    }

    // this works in 50% runs for no reason; maybe some async lazy calculations
    // const firstPoint = stage.getIntersection({ x, y });

    // Circles (polygon points) redraw every new click so we can find it only after last click
    const lastPoint = stage.find('Circle').slice(-1)[0];
    const firstPoint = lastPoint.parent.find('Circle')[0];
    // for closing the Polygon we should place cursor over the first point

    firstPoint.fire('mouseover');
    await delay(100);
    // and only after that we can click on it
    firstPoint.fire('click', { evt: { preventDefault: () => {} } });
  } catch (e) {
    return String(e);
  }
};

/**
 * Click and hold, move the cursor (with one pause in the middle) and release the mouse
 * @param {number} x
 * @param {number} y
 * @param {number} shiftX
 * @param {number} shiftY
 */
const dragKonva = async ([x, y, shiftX, shiftY]) => {
  const stage = window.Konva.stages[0];
  const delay = (timeout = 0) => new Promise(resolve => setTimeout(resolve, timeout));

  stage.fire('mousedown', { evt: { offsetX: x, offsetY: y } });
  await delay();
  stage.fire('mousemove', { evt: { offsetX: x + (shiftX >> 1), offsetY: y + (shiftY >> 1) } });
  await delay();
  // we should move the cursor to the last point and only after that release the mouse
  stage.fire('mousemove', { evt: { offsetX: x + shiftX, offsetY: y + shiftY } });
  await delay();
  // because some events work on mousemove and not on mouseup
  stage.fire('mouseup', { evt: { offsetX: x + shiftX, offsetY: y + shiftY } });
  // looks like Konva needs some time to update image according to dpi
  await delay(32);
};

/**
 * Check if there is layer with given color at given coords
 * @param {number} x
 * @param {number} y
 * @param {number[]} rgbArray
 * @param {number} tolerance
 */
const hasKonvaPixelColorAtPoint = ([x, y, rgbArray, tolerance]) => {
  const stage = window.Konva.stages[0];
  let result = false;

  const areEqualRGB = (a, b) => {
    for (let i = 3; i--;) {
      if (Math.abs(a[i] - b[i]) > tolerance) {
        return false;
      }
    }
    return true;
  };

  for (const layer of stage.getLayers()) {
    const rgba = layer.getContext().getImageData(x, y, 1, 1).data;

    if (!areEqualRGB(rgbArray, rgba)) continue;

    result = true;
  }

  return result;
};

const areEqualRGB = (a, b, tolerance) => {
  for (let i = 3; i--;) {
    if (Math.abs(a[i] - b[i]) > tolerance) {
      return false;
    }
  }
  return true;
};

const setKonvaLayersOpacity = ([opacity]) => {
  const stage = window.Konva.stages[0];

  for (const layer of stage.getLayers()) {
    layer.canvas._canvas.style.opacity = opacity;
  }
};

const getKonvaPixelColorFromPoint = ([x, y]) => {
  const stage = window.Konva.stages[0];
  const colors = [];

  for (const layer of stage.getLayers()) {
    const context = layer.getContext();
    const ratio = context.canvas.pixelRatio;
    const rgba = context.getImageData(x * ratio, y * ratio, 1, 1).data;

    colors.push(rgba);
  }

  return colors;
};

const clearModalIfPresent = () => {
  const modal = window.document.querySelector('.ant-modal-root');

  if (modal) {
    modal.remove();
  }
};

/**
 *
 * @param {object} bbox
 * @param {number} bbox.x
 * @param {number} bbox.y
 * @param {number} bbox.width
 * @param {number} bbox.height
 * @returns {{x: number, y: number}}
 */
const centerOfBbox = (bbox) => {
  return {
    x: bbox.x + bbox.width / 2,
    y: bbox.y + bbox.height / 2,
  };
};

/**
 * Generate the URL of the image of the specified size
 * @param {object} size
 * @param {number} size.width
 * @param {number} size.height
 * @returns {Promise<string>}
 */
async function generateImageUrl({ width, height }) {
  const canvas = document.createElement('canvas');

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');

  const centerX = width / 2;
  const centerY = height / 2;

  for (let k = 0; k < centerX; k += 50) {
    ctx.strokeRect(centerX - k, 0, k * 2, height);
  }
  for (let k = 0; k < centerY; k += 50) {
    ctx.strokeRect(0, centerY - k, width, k * 2);
  }

  return canvas.toDataURL();
}

const getCanvasSize = () => {
  const stage = window.Konva.stages[0];

  return {
    width: stage.width(),
    height: stage.height(),
  };
};
const getImageSize = () => {
  const image = window.document.querySelector('img[alt="LS"]');
  const clientRect = image.getBoundingClientRect();

  return {
    width: clientRect.width,
    height: clientRect.height,
  };
};
const getImageFrameSize = () => {
  const image = window.document.querySelector('img[alt="LS"]').parentElement;
  const clientRect = image.getBoundingClientRect();

  return {
    width: Math.round(clientRect.width),
    height: Math.round(clientRect.height),
  };
};
const setZoom = ([scale, x, y]) => {
  return new Promise((resolve) => {
    Htx.annotationStore.selected.objects.find(o => o.type === 'image').setZoom(scale, x, y);
    setTimeout(resolve, 30);
  });
};

/**
 * Count shapes on Konva, founded by selector
 * @param {string|function} selector from Konva's finding methods params
 */
const countKonvaShapes = async () => {
  const stage = window.Konva.stages[0];
  const regions = Htx.annotationStore.selected.regionStore.regions;
  let count = 0;

  regions.forEach(region => {
    count += stage.find('.' + region.id).filter(node => node.isVisible()).length;
  });

  return count;
};

const isTransformerExist = async () => {
  const stage = window.Konva.stages[0];
  const anchors = stage.find('._anchor').filter(shape => shape.getAttr('visible') !== false);

  return !!anchors.length;
};

const isRotaterExist = async () => {
  const stage = window.Konva.stages[0];
  const rotaters = stage.find('.rotater').filter(shape => shape.getAttr('visible') !== false);

  return !!rotaters.length;
};

const getRegionAbsoultePosition = async (shapeId) => {
  const stage = window.Konva.stages[0];
  const region = stage.findOne(shape => String(shape._id) === String(shapeId));

  if (!region) return null;

  const regionPosition = region.getAbsolutePosition();

  return {
    x: regionPosition.x,
    y: regionPosition.y,
    width: region.width(),
    height: region.height(),
  };
};

const switchRegionTreeView = (viewName) => {
  Htx.annotationStore.selected.regionStore.setView(viewName);
};

const serialize = () => window.Htx.annotationStore.selected.serializeAnnotation();

const selectText = async ({ selector, rangeStart, rangeEnd }) => {
  let [doc, win] = [document, window];

  let elem = document.querySelector(selector);

  if (elem.matches('iframe')) {
    doc = elem.contentDocument;
    win = elem.contentWindow;
    elem = doc.body;
  }

  const findOnPosition = (root, position, borderSide = 'left') => {
    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_ALL);

    let lastPosition = 0;
    let currentNode = walker.nextNode();
    let nextNode = walker.nextNode();

    while (currentNode) {
      const isText = currentNode.nodeType === Node.TEXT_NODE;
      const isBR = currentNode.nodeName === 'BR';

      if (isText || isBR) {
        const length = currentNode.length ? currentNode.length : 1;

        if (length + lastPosition >= position || !nextNode) {
          if (borderSide === 'right' && length + lastPosition === position && nextNode) {
            return { node: nextNode, position: 0 };
          }
          return { node: currentNode, position: isBR ? 0 : Math.min(Math.max(position - lastPosition, 0), length) };
        } else {
          lastPosition += length;
        }
      }

      currentNode = nextNode;
      nextNode = walker.nextNode();
    }
  };

  const start = findOnPosition(elem, rangeStart, 'right');
  const end = findOnPosition(elem, rangeEnd, 'left');

  const range = new win.Range();
  const selection = win.getSelection();

  range.setStart(start.node, start.position);
  range.setEnd(end.node, end.position);

  selection.removeAllRanges();
  selection.addRange(range);

  const evt = new MouseEvent('mouseup');

  evt.initMouseEvent('mouseup', true, true);
  elem.dispatchEvent(evt);
};

const getSelectionCoordinates = ({ selector, rangeStart, rangeEnd }) => {
  let [doc, win] = [document, window];
  let isIFrame = false;
  let elem = document.querySelector(selector);

  if (elem.matches('iframe')) {
    doc = elem.contentDocument;
    win = elem.contentWindow;
    elem = doc.body;
    isIFrame = true;
  }

  const findOnPosition = (root, position, borderSide = 'left') => {
    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_ALL);

    let lastPosition = 0;
    let currentNode = walker.nextNode();
    let nextNode = walker.nextNode();

    while (currentNode) {
      const isText = currentNode.nodeType === Node.TEXT_NODE;
      const isBR = currentNode.nodeName === 'BR';

      if (isText || isBR) {
        const length = currentNode.length ? currentNode.length : 1;

        if (length + lastPosition >= position || !nextNode) {
          if (borderSide === 'right' && length + lastPosition === position && nextNode) {
            return { node: nextNode, position: 0 };
          }
          return { node: currentNode, position: isBR ? 0 : Math.min(Math.max(position - lastPosition, 0), length) };
        } else {
          lastPosition += length;
        }
      }

      currentNode = nextNode;
      nextNode = walker.nextNode();
    }
  };

  const start = findOnPosition(elem, rangeStart, 'right');
  const end = findOnPosition(elem, rangeEnd, 'left');


  const range = new win.Range();
  const selection = win.getSelection();

  range.setStart(start.node, start.position);
  range.setEnd(end.node, end.position);

  selection.removeAllRanges();
  selection.addRange(range);

  const rangeRects = Array.from(range.getClientRects());
  const bboxes = [rangeRects.at(0), rangeRects.at(-1)];
  const iframeOffset = isIFrame ? elem.getBoundingClientRect() : { left: 0, top: 0 };

  return bboxes.map(bbox => ({
    x: bbox.left + iframeOffset.left,
    y: bbox.top + iframeOffset.top,
    width: bbox.width,
    height: bbox.height,
  }));
};

// Only for debugging
const whereIsPixel = ([rgbArray, tolerance]) => {
  const stage = window.Konva.stages[0];
  const areEqualRGB = (a, b) => {
    for (let i = 3; i--;) {
      if (Math.abs(a[i] - b[i]) > tolerance) {
        return false;
      }
    }
    return true;
  };
  const points = [];

  for (const layer of stage.getLayers()) {
    const canvas = layer.getCanvas();

    for (let x = 0; x < canvas.width; x++) {
      for (let y = 0; y < canvas.height; y++) {
        const rgba = layer.getContext().getImageData(x, y, 1, 1).data;

        if (areEqualRGB(rgbArray, rgba)) {
          points.push([x, y]);
        }
      }
    }
  }
  return points;
};

const dumpJSON = (obj) => {
  console.log(JSON.stringify(obj, null, '  '));
};

function _isObject(value) {
  const type = typeof value;

  return value !== null && (type === 'object' || type === 'function');
}

function _pickBy(obj, predicate, path = []) {
  if (!_isObject(obj) || Array.isArray(obj)) return obj;
  return Object.keys(obj).reduce((res, key) => {
    const val = obj[key];
    const fullPath = [...path, key];

    if (predicate(val, key, fullPath)) {
      res[key] = _pickBy(val, predicate, fullPath);
    }
    return res;
  }, {});
}

function _not(predicate) {
  return (...args) => {
    return !predicate(...args);
  };
}

function saveDraftLocally(ls, annotation) {
  window.LSDraft = annotation.serializeAnnotation();
}
function getLocallySavedDraft() {
  return window.LSDraft;
}

function omitBy(object, predicate) {
  return _pickBy(object, _not(predicate));
}

function hasSelectedRegion() {
  return !!Htx.annotationStore.selected.highlightedNode;
}

// `mulberry32` (simple generator with a 32-bit state)
function createRandomWithSeed(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;

    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function createRandomIntWithSeed(seed) {
  const random = createRandomWithSeed(seed);

  return function(min, max) {
    return Math.floor(random() * (max - min + 1) + min);
  };
}

module.exports = {
  initLabelStudio,
  createLabelStudioInitFunction,
  setFeatureFlagsDefaultValue,
  setFeatureFlags,
  hasFF,
  createAddEventListenerScript,
  waitForImage,
  waitForAudio,
  getCurrentMedia,
  waitForObjectsReady,
  delay,

  getSizeConvertor,
  convertToFixed,

  emulateClick,
  emulateKeypress,
  clickRect,
  clickKonva,
  clickMultipleKonva,
  polygonKonva,
  dragKonva,
  areEqualRGB,
  hasKonvaPixelColorAtPoint,
  getKonvaPixelColorFromPoint,
  getCanvasSize,
  getImageSize,
  getImageFrameSize,
  getRegionAbsoultePosition,
  setKonvaLayersOpacity,
  setZoom,
  whereIsPixel,
  countKonvaShapes,
  isTransformerExist,
  isRotaterExist,
  switchRegionTreeView,
  hasSelectedRegion,
  clearModalIfPresent,
  centerOfBbox,
  generateImageUrl,

  serialize,
  selectText,
  getSelectionCoordinates,

  saveDraftLocally,
  getLocallySavedDraft,

  omitBy,
  dumpJSON,

  createRandomWithSeed,
  createRandomIntWithSeed,
};
