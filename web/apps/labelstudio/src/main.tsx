import { registerAnalytics } from "@humansignal/core";
registerAnalytics();

// Must import before ./app/App — ESM evaluates imports before module body, and App calls render() at top level.
import "@humansignal/app-common/pages/AccountSettings/hotkeys/bootstrapHotkeys";
import "@humansignal/app-common/i18n/init";
import "./app/App";
import "./utils/service-worker";
import "./utils/state-registry-lso";
