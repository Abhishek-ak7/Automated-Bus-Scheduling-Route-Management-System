import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import "../src/index.css"

/* AUTH */
import Login from "./pages/auth/Login";

/* ROUTE GUARD */
import ProtectedRoute from "./components/common/ProtectedRoute";

/* ADMIN LAYOUT */
import AdminLayout from "./components/layout/AdminLayout";

/* ADMIN PAGES */
import Dashboard from "./pages/admin/Dashboard";
import Tracking from "./pages/admin/Tracking";
import RoutesPage from "./pages/admin/RoutesPage";
import SchedulesPage from "./pages/admin/SchedulesPage";
import FleetPage from "./pages/admin/FleetPage";
import AnalyticsPage from "./pages/admin/AnalyticsPage";

/* PASSENGER PAGES */
import ArrivalBoard from "./pages/passenger/ArrivalBoard";
import LiveBusMap from "./pages/passenger/LiveBusMap";
import TripPlanner from "./pages/passenger/TripPlanner";
import DemandHeatmap from "./pages/admin/DemandHeatmap";

/* ROUTER */
const router = createBrowserRouter([
  {
    path: "/",
    element: <Login />,
  },

  {
    path: "/login",
    element: <Login />,
  },

  {
    path: "/arrivals",
    element: <ArrivalBoard />,
  },

  {
    path: "/live-map",
    element: <LiveBusMap />,
  },

  {
    path: "/trip-planner",
    element: <TripPlanner />,
  },

  {
    path: "/admin",
    element: (
      <ProtectedRoute>
        <AdminLayout />
      </ProtectedRoute>
    ),
children: [
  { index: true, element: <Dashboard /> },
  { path: "tracking", element: <Tracking /> },
  { path: "routes", element: <RoutesPage /> },
  { path: "schedules", element: <SchedulesPage /> },
  { path: "fleet", element: <FleetPage /> },
{ path: "analytics", element: <AnalyticsPage /> },
  { path: "demand-heatmap", element: <DemandHeatmap /> }
],
  },
]);

/* RENDER APP */
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router}/>
  </React.StrictMode>
);
