// Custom commands can be executed with `cy.[command_name]`
import "./commands";

import "@cypress/code-coverage/support";

// Output spec steps
require("cypress-terminal-report/src/installLogsCollector")();
