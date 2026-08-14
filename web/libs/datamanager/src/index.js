import { DataManager } from "./sdk";

// Ensure the shared i18next singleton is initialized even when the Data Manager
// is used standalone (the host app normally initializes it at boot). Idempotent.
import "@humansignal/app-common/i18n/init";

window.DataManager = DataManager;

export default DataManager;
