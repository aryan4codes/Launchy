import { BrowserRouter, Route, Routes } from "react-router-dom";

import ResultsPage from "@/pages/ResultsPage";
import WorkflowStudio from "@/WorkflowStudio";

const basename =
  import.meta.env.BASE_URL === "/"
    ? undefined
    : import.meta.env.BASE_URL.replace(/\/+$/, "");

export default function App() {
  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/" element={<WorkflowStudio />} />
        <Route path="/results/:runId" element={<ResultsPage />} />
      </Routes>
    </BrowserRouter>
  );
}
