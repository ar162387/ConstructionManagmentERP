import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { COMPANY_LOGO_URL } from "./lib/company.ts";

const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
if (favicon) favicon.href = COMPANY_LOGO_URL;

createRoot(document.getElementById("root")!).render(<App />);
