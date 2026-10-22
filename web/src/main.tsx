import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { StoreProvider } from "./app/store";
import { App } from "./app/App";
import { CatalogCheck } from "./screens/CatalogCheck";
import { applyTheme, loadProfile } from "./app/profile";
import { watchErrors } from "./app/errors";
import { watchTaps } from "./app/taps";
import { watchPicks } from "./app/picks";
import { watchAppLinks } from "./app/appLinks";
import { installFormShim } from "./app/formShim";

// Review photos go as JSON: the hosting blocks forms with files (app/formShim).
installFormShim();

// Before the first paint, so a dark device never flashes the wrong theme.
applyTheme(loadProfile().theme);
watchErrors();
watchTaps();
watchPicks();
watchAppLinks();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {new URLSearchParams(location.search).has("check") ? <CatalogCheck /> : (
      <StoreProvider>
        <App />
      </StoreProvider>
    )}
  </StrictMode>,
);
