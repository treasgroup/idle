import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { StoreProvider } from "./app/store";
import { App } from "./app/App";
import { CatalogCheck } from "./screens/CatalogCheck";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {new URLSearchParams(location.search).has("check") ? <CatalogCheck /> : (
      <StoreProvider>
        <App />
      </StoreProvider>
    )}
  </StrictMode>,
);
