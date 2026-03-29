import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage/LoginPage";
import RequireAuth from "./auth/RequireAuth";
import DashboardPage from "./pages/DashboardPage/DashboardPage";
import RequireRole from "./auth/RequireRole";
import { IssueReportsPage } from "./pages/IssueReportsPage/IssueReportsPage";
import { InventoryPage } from "./pages/InventoryPage/InventoryPage";
import { ReorderPage } from "./pages/ReorderPage/ReorderPage";
import { PartsPage } from "./pages/PartsPage/PartsPage";
import { PartInstallationsPage } from "./pages/PartInstallationsPage/PartInstallationsPage";
import { UsersPage } from "./pages/UsersPage/UsersPage";
import TeamCarsPage from "./pages/TeamCarsPage/TeamCarsPage";
import TeamCarPage from "./pages/TeamCarPage/TeamCarPage";
import WorkOrdersPage from "./pages/WorkOrdersPage/WorkOrdersPage";
import SuppliersPage from "./pages/SuppliersPage/SuppliersPage";
import { WorkOrderDetailsPage } from "./pages/WorkOrderDetailsPage/WorkOrderDetailsPage";
import CarSessionsPage from "./pages/CarSessionsPage/CarSessionsPage";
import UserSettingsPage from "./pages/UserSettingsPage/UserSettingsPage";
import InventoryLocationsPage from "./pages/InventoryLocationsPage/InventoryLocationsPage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        }
      />
      <Route path="/user-settings" element={<UserSettingsPage />} />
      <Route
        path="/team-cars"
        element={
          <RequireAuth>
            <TeamCarsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/team-cars/:id"
        element={
          <RequireAuth>
            <TeamCarPage />
          </RequireAuth>
        }
      />
      <Route
        path="/car-sessions"
        element={
          <RequireAuth>
            <CarSessionsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/work-orders"
        element={
          <RequireAuth>
            <WorkOrdersPage />
          </RequireAuth>
        }
      />
      <Route
        path="/work-orders/:id"
        element={
          <RequireAuth>
            <WorkOrderDetailsPage />
          </RequireAuth>
        }
      />

      <Route
        path="/issue-reports"
        element={
          <RequireAuth>
            <IssueReportsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/inventory"
        element={
          <RequireAuth>
            <InventoryPage />
          </RequireAuth>
        }
      />
      <Route
        path="/inventory/reorder"
        element={
          <RequireRole allow={["Manager", "PartsClerk"]}>
            <ReorderPage />
          </RequireRole>
        }
      />
      <Route
        path="/suppliers"
        element={
          <RequireRole allow={["Manager", "PartsClerk"]}>
            <SuppliersPage />
          </RequireRole>
        }
      />
      <Route
        path="/inventory-locations"
        element={
          <RequireRole allow={["Manager", "PartsClerk"]}>
            <InventoryLocationsPage />
          </RequireRole>
        }
      />
      <Route
        path="/parts"
        element={
          <RequireRole allow={["Manager", "PartsClerk"]}>
            <PartsPage />
          </RequireRole>
        }
      />
      <Route
        path="/part-installations"
        element={
          <RequireRole allow={["Manager", "Mechanic", "PartsClerk"]}>
            <PartInstallationsPage />
          </RequireRole>
        }
      />

      <Route
        path="/users"
        element={
          <RequireRole allow={["Manager"]}>
            <UsersPage />
          </RequireRole>
        }
      />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
