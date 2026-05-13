import { Navigate } from "react-router-dom";

/** @deprecated Use `/twin` (Digital Twin hub; chat is the default tab). */
export default function TwinPage() {
  return <Navigate to="/twin" replace />;
}
