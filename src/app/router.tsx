import { createBrowserRouter, Navigate } from "react-router-dom";
import CareerSelect from "../features/careers/CareerSelect";
import Dashboard from "../features/dashboard/Dashboard";
import MatchScreen from "../features/match/MatchScreen";
import WrestlerPage from "../features/roster/WrestlerPage";
import TitlesPage from "../features/titles/TitlesPage";
import FederationPage from "../features/federation/FederationPage";
import BookingPage from "../features/booking/BookingPage";

export const router = createBrowserRouter([
  { path: "/", element: <CareerSelect /> },
  { path: "/career/:saveId", element: <Dashboard /> },
  { path: "/career/:saveId/wrestler/:wrestlerId", element: <WrestlerPage /> },
  { path: "/career/:saveId/titles", element: <TitlesPage /> },
  { path: "/career/:saveId/federation", element: <FederationPage /> },
  { path: "/career/:saveId/booking", element: <BookingPage /> },
  { path: "/match", element: <MatchScreen /> },
  { path: "*", element: <Navigate to="/" replace /> },
]);
