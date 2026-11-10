import { createBrowserRouter, Navigate } from "react-router-dom";
import CareerSelect from "../features/careers/CareerSelect";
import Dashboard from "../features/dashboard/Dashboard";
import MatchScreen from "../features/match/MatchScreen";
import WrestlerPage from "../features/roster/WrestlerPage";
import TitlesPage from "../features/titles/TitlesPage";

export const router = createBrowserRouter([
  { path: "/", element: <CareerSelect /> },
  { path: "/career/:saveId", element: <Dashboard /> },
  { path: "/career/:saveId/wrestler/:wrestlerId", element: <WrestlerPage /> },
  { path: "/career/:saveId/titles", element: <TitlesPage /> },
  { path: "/match", element: <MatchScreen /> },
  { path: "*", element: <Navigate to="/" replace /> },
]);
