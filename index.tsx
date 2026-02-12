import { createRoot } from "react-dom/client";
import { App } from "./App";
import {
  HelmetProvider,
} from "react-helmet-async"
import { showConsoleSignature } from "./src/lib/consoleSignature";

const container = document.getElementById("root") as HTMLDivElement;
createRoot(container).render(<HelmetProvider><App /></HelmetProvider>);

// Show console signature Easter egg
showConsoleSignature();
