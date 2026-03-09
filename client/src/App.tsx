import { BrowserRouter, Routes, Route } from "react-router-dom";
import AuthGuard from "./auth/AuthGuard";
import MainLayout from "./layouts/MainLayout";

import Home from "./pages/Home/Home";
import CreatePR from "./pages/PR/CreatePR/CreatePR";
import HistoryPR from "./pages/PR/HistoryPR/HistoryPR";
import Login from "./pages/Login/Login";
import ExportPO from "./pages/PO/ExportPO/ExportPO";


function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* public */}
        <Route path="/login" element={<Login />} />

        {/* protected */}
        <Route element={<AuthGuard />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/createPR" element={<CreatePR />} />
            <Route path="/HistoryPR" element={<HistoryPR />} />
            <Route path="/ExportPO" element={<ExportPO />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
