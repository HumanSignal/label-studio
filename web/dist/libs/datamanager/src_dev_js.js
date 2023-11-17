"use strict";
(self["webpackChunklabelstudio"] = self["webpackChunklabelstudio"] || []).push([["src_dev_js"],{

/***/ "./src/dev.js":
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   initDevApp: () => (/* binding */ initDevApp)
/* harmony export */ });
/* harmony import */ var core_js_modules_es_promise_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("../../node_modules/core-js/modules/es.promise.js");
/* harmony import */ var core_js_modules_es_promise_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(core_js_modules_es_promise_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _components_Common_Button_Button__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__("./src/components/Common/Button/Button.js");
/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__("../../node_modules/react/jsx-dev-runtime.js");
var _jsxFileName = "/Users/juliosgarbi/src/label-studio/web/libs/datamanager/src/dev.js";



const API_GATEWAY = ({"NX_CLI_SET":"true","NX_LOAD_DOT_ENV_FILES":"true","NX_INVOKED_BY_RUNNER":"true","NX_WORKSPACE_ROOT":"/Users/juliosgarbi/src/label-studio/web","NX_TERMINAL_OUTPUT_PATH":"/Users/juliosgarbi/src/label-studio/web/.nx/cache/terminalOutputs/10894181345516136253","NX_STREAM_OUTPUT":"true","NX_TASK_TARGET_PROJECT":"datamanager","NX_TASK_TARGET_TARGET":"build","NX_TASK_HASH":"10894181345516136253"}).NX_API_GATEWAY;
const LS_ACCESS_TOKEN = ({"NX_CLI_SET":"true","NX_LOAD_DOT_ENV_FILES":"true","NX_INVOKED_BY_RUNNER":"true","NX_WORKSPACE_ROOT":"/Users/juliosgarbi/src/label-studio/web","NX_TERMINAL_OUTPUT_PATH":"/Users/juliosgarbi/src/label-studio/web/.nx/cache/terminalOutputs/10894181345516136253","NX_STREAM_OUTPUT":"true","NX_TASK_TARGET_PROJECT":"datamanager","NX_TASK_TARGET_TARGET":"build","NX_TASK_HASH":"10894181345516136253"}).NX_LS_ACCESS_TOKEN;

/**
 * @param {import("../src/sdk/dm-sdk").DataManager} DataManager
 */

const initDevApp = async DataManager => {
  const gatewayAPI = API_GATEWAY != null ? API_GATEWAY : "http://localhost:8081/api/dm";
  const useExternalSource = !!gatewayAPI;
  const dm = new DataManager({
    root: document.getElementById("app"),
    toolbar: "actions columns filters ordering review-button label-button loading-possum error-box | refresh view-toggle",
    apiGateway: gatewayAPI,
    apiVersion: 2,
    apiMockDisabled: useExternalSource,
    apiHeaders: {
      Authorization: `Token ${LS_ACCESS_TOKEN}`
    },
    interfaces: {
      groundTruth: true
    },
    labelStudio: {
      user: {
        pk: 1,
        firstName: "James",
        lastName: "Dean"
      }
    },
    table: {
      hiddenColumns: {
        explore: ["tasks:completed_at", "tasks:data"]
      },
      visibleColumns: {
        labeling: ["tasks:id", "tasks:was_cancelled", "tasks:data.image", "tasks:data.text", "annotations:id", "annotations:task_id"]
      }
    },
    instruments: {
      'review-button': () => {
        return () => /*#__PURE__*/(0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_2__.jsxDEV)(_components_Common_Button_Button__WEBPACK_IMPORTED_MODULE_1__.Button, {
          style: {
            width: 105
          },
          children: "Review"
        }, void 0, false, {
          fileName: _jsxFileName,
          lineNumber: 50,
          columnNumber: 22
        }, undefined);
      }
    },
    type: 'dm'
  });
  dm.on("lsf:groundTruth", () => {
    console.log('lsf ground truth set');
  });
  dm.on("taskSelected", () => {
    console.log('task selected');
  });
};

/***/ })

}]);
//# sourceMappingURL=src_dev_js.js.map