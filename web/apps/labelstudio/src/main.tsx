import { registerAnalytics } from "@humansignal/core";
import { initI18n } from "@humansignal/app-common/i18n";
registerAnalytics();

// Must import before ./app/App because App calls render() at module evaluation time.
import "@humansignal/app-common/pages/AccountSettings/hotkeys/bootstrapHotkeys";
import "./utils/service-worker";
import "./utils/state-registry-lso";

await initI18n();
await import("./app/App");
