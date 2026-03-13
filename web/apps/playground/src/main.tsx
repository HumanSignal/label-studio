import { createRoot } from "react-dom/client";
import "./utils/embedFeatureFlags";
import { PlaygroundApp } from "./components/PlaygroundApp";

import "@humansignal/ui/src/styles.prefix.css";
import "@humansignal/ui/src/tailwind.css";

const root = createRoot(document.getElementById("root")!);
root.render(<PlaygroundApp />);
