import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { StoreProvider } from "./app/store";
import { App } from "./app/App";
import { CatalogCheck } from "./screens/CatalogCheck";
import { applyTheme, loadProfile } from "./app/profile";
import { watchErrors } from "./app/errors";
import { watchTaps } from "./app/taps";

// Before the first paint, so a dark device never flashes the wrong theme.
applyTheme(loadProfile().theme);
watchErrors();
watchTaps();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {new URLSearchParams(location.search).has("check") ? <CatalogCheck /> : (
      <StoreProvider>
        <App />
      </StoreProvider>
    )}
  </StrictMode>,
);
