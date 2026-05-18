// STEP 1 - React entry. createRoot + StrictMode (catches accidental side-effects
// in dev by double-mounting). Single page, no router needed.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
