import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Add Font Awesome CDN for icons
const fontAwesomeScript = document.createElement("script");
fontAwesomeScript.src = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/js/all.min.js";
fontAwesomeScript.defer = true;
document.head.appendChild(fontAwesomeScript);

// Add Inter font from Google Fonts
const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap";
document.head.appendChild(fontLink);

// Add title
const titleElement = document.createElement("title");
titleElement.textContent = "WealthWise - Personal Finance Manager";
document.head.appendChild(titleElement);

createRoot(document.getElementById("root")!).render(<App />);
