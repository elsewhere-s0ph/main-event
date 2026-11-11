import { createBrowserRouter, Navigate } from "react-router-dom";
import HomeScreen from "../features/home/HomeScreen";
import CareerSelect from "../features/careers/CareerSelect";
import CareerLayout from "../features/dashboard/CareerLayout";
import Dashboard from "../features/dashboard/Dashboard";
import MatchScreen from "../features/match/MatchScreen";
import RosterPage from "../features/roster/RosterPage";
import WrestlerPage from "../features/roster/WrestlerPage";
import TitlesPage from "../features/titles/TitlesPage";
import FederationPage from "../features/federation/FederationPage";
import BookingPage from "../features/booking/BookingPage";
import WorldPage from "../features/world/WorldPage";

export const router = createBrowserRouter([
  { path: "/", element: <HomeScreen /> },
  { path: "/nuova", element: <CareerSelect /> },
  {
    path: "/career/:saveId",
    element: <CareerLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "roster", element: <RosterPage /> },
      { path: "wrestler/:wrestlerId", element: <WrestlerPage /> },
      { path: "titles", element: <TitlesPage /> },
      { path: "federation", element: <FederationPage /> },
      { path: "booking", element: <BookingPage /> },
      { path: "world", element: <WorldPage /> },
    ],
  },
  { path: "/match", element: <MatchScreen /> },
  { path: "*", element: <Navigate to="/" replace /> },
]);
