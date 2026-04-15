import App from "./app/App";
import MapaVisualizacao from "./app/MapaVisualizacao";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

export default function RouterApp() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/visualizacao" replace />} />
        <Route path="/admin" element={<App />} />
        <Route path="/visualizacao" element={<MapaVisualizacao />} />
      </Routes>
    </BrowserRouter>
  );
}
