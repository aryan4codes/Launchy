import { BrowserRouter, Route, Routes } from "react-router-dom";

import CampaignLandingPage from "@/pages/CampaignLandingPage";
import CampaignPage from "@/pages/CampaignPage";
import DigitalTwinPage from "@/pages/DigitalTwinPage";
import LandingPage from "@/pages/LandingPage";
import ResultsPage from "@/pages/ResultsPage";
import VoicePage from "@/pages/VoicePage";
import WorkflowStudio from "@/WorkflowStudio";

const basename =
  import.meta.env.BASE_URL === "/"
    ? undefined
    : import.meta.env.BASE_URL.replace(/\/+$/, "");

export default function App() {
  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/studio" element={<WorkflowStudio />} />
        <Route path="/campaigns" element={<CampaignLandingPage />} />
        <Route path="/campaigns/:runId" element={<CampaignPage />} />
        <Route path="/twin" element={<DigitalTwinPage />} />
        <Route path="/voice" element={<VoicePage />} />
        <Route path="/results/:runId" element={<ResultsPage />} />
      </Routes>
    </BrowserRouter>
  );
}
