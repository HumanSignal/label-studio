import { types } from 'mobx-state-tree';
import { FileLoader } from '../../../utils/FileLoader';
import { clamp } from '../../../utils/utilities';

const fileLoader = new FileLoader();

export const ImageEntity = types.model({
  id: types.identifier,
  src: types.string,
  index: types.number,

  rotation: types.optional(types.number, 0),

  /**
   * Natural sizes of Image
   * Constants
   */
  naturalWidth: types.optional(types.integer, 1),
  naturalHeight: types.optional(types.integer, 1),

  stageWidth: types.optional(types.number, 1),
  stageHeight: types.optional(types.number, 1),

  /**
   * Zoom Scale
   */
  zoomScale: types.optional(types.number, 1),

  /**
     * Coordinates of left top corner
     * Default: { x: 0, y: 0 }
     */
  zoomingPositionX: types.optional(types.number, 0),
  zoomingPositionY: types.optional(types.number, 0),

  /**
     * Brightness of Canvas
     */
  brightnessGrade: types.optional(types.number, 100),

  contrastGrade: types.optional(types.number, 100),
}).volatile(() => ({
  stageRatio: 1,
  // Container's sizes causing limits to calculate a scale factor
  containerWidth: 1,
  containerHeight: 1,

  stageZoom: 1,
  stageZoomX: 1,
  stageZoomY: 1,
  currentZoom: 1,

  /** Is image downloaded to local cache */
  downloaded: false,
  /** Is image being downloaded */
  downloading: false,
  /** If error happened during download */
  error: false,
  /** Download progress 0..1 */
  progress: 0,
  /** Local image src created with URL.createURLObject */
  currentSrc: undefined,
  /** Is image loaded using `<img/>` tag and cached by the browser */
  imageLoaded: false,
})).actions((self) => ({
  preload() {
    if (self.ensurePreloaded()) return;

    self.setDownloading(true);

    fileLoader.download(self.src, (_t, _l, progress) => {
      self.setProgress(progress);
    }).then((url) => {
      self.setDownloaded(true);
      self.setDownloading(false);
      self.setCurrentSrc(url);
    }).catch(() => {
      self.setDownloading(false);
      self.setError(true);
    });
  },

  ensurePreloaded() {
    if (fileLoader.isError(self.src)) {
      self.setDownloading(false);
      self.setError(true);
      return true;
    } else if (fileLoader.isPreloaded(self.src)) {
      self.setDownloading(false);
      self.setDownloaded(true);
      self.setProgress(1);
      self.setCurrentSrc(fileLoader.getPreloadedURL(self.src));
      return true;
    }
    return false;
  },

  setImageLoaded(value) {
    self.imageLoaded = value;
  },

  setProgress(progress) {
    self.progress = clamp(progress, 0, 100);
  },

  setDownloading(downloading) {
    self.downloading = downloading;
  },

  setDownloaded(downloaded) {
    self.downloaded = downloaded;
  },

  setCurrentSrc(src) {
    self.currentSrc = src;
  },

  setError() {
    self.error = true;
  },
})).actions(self => ({
  setRotation(angle) {
    self.rotation = angle;
  },

  setNaturalWidth(width) {
    self.naturalWidth = width;
  },

  setNaturalHeight(height) {
    self.naturalHeight = height;
  },

  setStageWidth(width) {
    self.stageWidth = width;
  },

  setStageHeight(height) {
    self.stageHeight = height;
  },

  setStageRatio(ratio) {
    self.stageRatio = ratio;
  },

  setContainerWidth(width) {
    self.containerWidth = width;
  },

  setContainerHeight(height) {
    self.containerHeight = height;
  },

  setStageZoom(zoom) {
    self.stageZoom = zoom;
  },

  setStageZoomX(zoom) {
    self.stageZoomX = zoom;
  },

  setStageZoomY(zoom) {
    self.stageZoomY = zoom;
  },

  setCurrentZoom(zoom) {
    self.currentZoom = zoom;
  },

  setZoomScale(zoomScale) {
    self.zoomScale = zoomScale;
  },

  setZoomingPositionX(x) {
    self.zoomingPositionX = x;
  },

  setZoomingPositionY(y) {
    self.zoomingPositionY = y;
  },

  setBrightnessGrade(grade) {
    self.brightnessGrade = grade;
  },

  setContrastGrade(grade) {
    self.contrastGrade = grade;
  },
}));
