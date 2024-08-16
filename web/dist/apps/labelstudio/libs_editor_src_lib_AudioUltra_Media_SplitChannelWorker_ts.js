/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "../../libs/editor/src/lib/AudioUltra/Common/Worker/index.ts":
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ComputeWorker: () => (/* binding */ ComputeWorker)
/* harmony export */ });
class ComputeWorker {
  constructor(url) {
    this.worker = void 0;
    this.worker = url;
  }
  async compute(data) {
    var _result$data;
    const result = await this.sendMessage(this.worker, {
      data,
      type: "compute"
    }, true);
    return result == null || (_result$data = result.data) == null || (_result$data = _result$data.result) == null ? void 0 : _result$data.data;
  }
  async precompute(data) {
    await this.sendMessage(this.worker, {
      data,
      type: "precompute"
    });
  }
  async store(data) {
    await this.sendMessage(this.worker, {
      data,
      type: "store"
    });
  }
  async getStorage() {
    var _response$data;
    const response = await this.sendMessage(this.worker, {
      type: "getStorage"
    }, true);
    return response == null || (_response$data = response.data) == null ? void 0 : _response$data.result;
  }
  destroy() {
    this.worker.terminate();
  }
  sendMessage(worker, data, waitResponse = false) {
    return new Promise(resolve => {
      const eventId = Math.random().toString();
      if (waitResponse) {
        const resolver = e => {
          if (eventId === e.data.eventId) {
            worker.removeEventListener("message", resolver);
            resolve(e);
          }
        };
        worker.addEventListener("message", resolver);
      }
      worker.postMessage(Object.assign({}, data, {
        eventId
      }));
      if (!waitResponse) resolve(undefined);
    });
  }
}
ComputeWorker.Messenger = {
  receive({
    compute: computeCallback,
    precompute: precomputeCallback
  }) {
    const storage = {};
    const storeData = e => {
      Object.assign(storage, e.data.data);
    };
    const compute = (data, eventId) => {
      const respond = result => {
        self.postMessage({
          result,
          eventId
        });
      };
      computeCallback(data, storage, respond);
    };
    const precompute = data => {
      precomputeCallback == null || precomputeCallback(data, storage, result => {
        Object.assign(storage, result);
      });
    };
    const getStorage = eventId => {
      self.postMessage({
        result: storage,
        eventId
      });
    };
    self.addEventListener("message", e => {
      if (!e.data) return;
      const {
        data,
        type,
        eventId
      } = e.data;
      switch (type) {
        case "compute":
          compute(data, eventId);
          break;
        case "precompute":
          precompute(data);
          break;
        case "store":
          storeData(e);
          break;
        case "getStorage":
          getStorage(eventId);
          break;
      }
    });
  }
};

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   splitChannels: () => (/* binding */ splitChannels)
/* harmony export */ });
/* harmony import */ var _Common_Worker__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("../../libs/editor/src/lib/AudioUltra/Common/Worker/index.ts");

function splitChannels({
  value,
  channelCount
}) {
  const channels = [];

  // Create new Float32Array for each channel
  for (let c = 0; c < channelCount; c++) {
    channels[c] = new Float32Array(value.length / channelCount);
  }

  // Split the channels into separate Float32Array samples
  for (let sample = 0; sample < value.length; sample++) {
    // interleaved channels
    // ie. 2 channels
    // [channel1, channel2, channel1, channel2, ...]
    const channel = sample % channelCount;
    // index of the channel sample
    // ie. 2 channels
    // sample = 8, channel = 0, channelIndex = 4
    // sample = 9, channel = 1, channelIndex = 4
    // sample = 10, channel = 0, channelIndex = 5
    // sample = 11, channel = 1, channelIndex = 5
    const channelIndex = Math.floor(sample / channelCount);
    channels[channel][channelIndex] = value[sample];
  }
  return channels;
}
_Common_Worker__WEBPACK_IMPORTED_MODULE_0__.ComputeWorker.Messenger.receive({
  compute: (data, _storage, respond) => {
    respond({
      data: splitChannels(data)
    });
  },
  precompute: (data, _storage, respond) => {
    respond({
      data: splitChannels(data)
    });
  }
});
})();

/******/ })()
;
//# sourceMappingURL=libs_editor_src_lib_AudioUltra_Media_SplitChannelWorker_ts.js.map