import { createBrowserRouter, Navigate } from "react-router-dom";
import CareerSelect from "../features/careers/CareerSelect";
import Dashboard from "../features/dashboard/Dashboard";

export const router = createBrowserRouter([
  { path: "/", element: <CareerSelect /> },
  { path: "/career/:saveId", element: <Dashboard /> },
  { path: "*", element: <Navigate to="/" replace /> },
]);
