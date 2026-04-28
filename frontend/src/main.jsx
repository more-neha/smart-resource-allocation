import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { I18nextProvider } from "react-i18next";
import App from "./App";
import "./i18n";
import i18n from "./i18n";
import "./index.css";

// Firebase Auth commonly allows localhost by default but not 127.0.0.1.
if (window.location.hostname === "127.0.0.1") {
  const redirectUrl = `${window.location.protocol}//localhost:${window.location.port}${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.location.replace(redirectUrl);
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <App />
    </I18nextProvider>
  </StrictMode>,
);
