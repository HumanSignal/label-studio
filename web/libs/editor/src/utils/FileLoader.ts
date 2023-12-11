type OnProgressCallback = (total: number, loaded: number, progress: number) => void;

/**
 * @class FileLoader
 * @description Allows to download any file from a given URL and provide a data URL for it
 */
export class FileLoader {
  private fileCache: Map<string, string> = new Map();
  private errorCache: Map<string, Error> = new Map();

  /**
   * @method download
   * @description Downloads a file from a given URL and returns a data URL for it
   * @description Progress event available to track download progress
   */
  download(url: string, onProgress?: OnProgressCallback) {
    if (!url) throw new Error('No URL provided for download');

    return new Promise((resolve, reject) => {
      if (this.fileCache.has(url)) {
        resolve(this.fileCache.get(url));
        return;
      }
      if (this.errorCache.has(url)) {
        reject(this.errorCache.get(url));
        return;
      }

      const xhr = new XMLHttpRequest();

      xhr.responseType = 'blob';

      xhr.addEventListener('load', async () => {
        if (xhr.readyState === 4 && xhr.status === 200) {
          const localURL = this.createDataURL(xhr.response);

          this.fileCache.set(url, localURL);

          // in case we're dealing with an image, let's cache it using default browser mechanisms
          // this will allow instant rendering in the future
          if (xhr.getResponseHeader('content-type')?.match(/image/)) {
            try {
              await this.cacheImage(localURL);
            } catch (err) {
              reject(err);
              return;
            }
          }

          resolve(localURL);
        }
      });

      xhr.addEventListener('progress', (e) => {
        const { total, loaded } = e;
        const progress = loaded / total;

        onProgress?.(total, loaded, progress);
      });

      xhr.addEventListener('error', () => {
        const error = new Error('Network error');

        reject(error);

        this.errorCache.set(url, error);
      });

      xhr.open('GET', url);
      xhr.send();
    });
  }

  isPreloaded(url: string) {
    return this.fileCache.has(url);
  }

  isError(url: string) {
    return this.errorCache.has(url);
  }

  getPreloadedURL(url: string) {
    return this.fileCache.get(url);
  }

  getError(url: string) {
    return this.errorCache.get(url);
  }

  private createDataURL(response: any) {
    const dataURL = URL.createObjectURL(response);

    return dataURL;
  }

  private cacheImage(url: string) {
    return new Promise<void>((resolve, reject) => {
      const image = new Image();

      image.onload = () => {
        resolve();
      };

      image.onerror = () => {
        reject();
      };

      image.src = url;
    });
  }
}
