import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import "@shopify/polaris/build/esm/styles.css";
import Dashboard from "./pages/index.jsx";
import Meals from "./pages/meals.jsx";
import Discounts from "./pages/discounts.jsx";
import Orders from "./pages/orders.jsx";
import Settings from "./pages/settings.jsx";

function App() {
  return (
    <AppProvider i18n={enTranslations}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/meals" element={<Meals />} />
          <Route path="/discounts" element={<Discounts />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
createRoot(document.getElementById("root")).render(<App />);
