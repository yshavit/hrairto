import React from "react";
import ReactDOM from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "./index.css";
import TrayPopup from "./TrayPopup";
import YearlyGoals from "./YearlyGoals";

const Root = getCurrentWindow().label === "goals" ? YearlyGoals : TrayPopup;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
