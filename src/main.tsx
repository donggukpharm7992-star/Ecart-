import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { applyPwaMetadata, registerAppServiceWorker } from "./pwa";
import "./styles.css";

applyPwaMetadata();
registerAppServiceWorker();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
