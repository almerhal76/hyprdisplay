import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css"; // Meng-import gaya premium kita

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
