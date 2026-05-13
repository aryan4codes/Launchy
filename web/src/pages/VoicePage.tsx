import { Navigate } from "react-router-dom";

/** @deprecated Use `/twin?tab=train` (Digital Twin). */
export default function VoicePage() {
  return <Navigate to="/twin?tab=train" replace />;
}
