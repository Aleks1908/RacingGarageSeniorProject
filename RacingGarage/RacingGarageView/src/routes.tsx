import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage/LoginPage";
import RequireAuth from "./auth/RequireAuth";
import DashboardPage from "./pages/DashboardPage/DashboardPage";
import RequireRole from "./auth/RequireRole";
import { WorkOrdersPage } from "./pages/WorkOrdersPage/WorkOrdersPage";
import { WorkOrderDetailsPage } from "./pages/WorkOrderDetailsPage/WorkOrderDetailsPage";
import { IssueReportsPage } from "./pages/IssueReportsPage/IssueReportsPage";
import { NewIssueReportPage } from "./pages/NewIssueReportPage/NewIssueReportPage";
import { InventoryPage } from "./pages/InventoryPage/InventoryPage";
import { ReorderPage } from "./pages/ReorderPage/ReorderPage";
import { SuppliersPage } from "./pages/SuppliersPage/SuppliersPage";
import { PartsPage } from "./pages/PartsPage/PartsPage";
import { InventoryMovementsPage } from "./pages/InventoryMovementsPage/InventoryMovementsPage";
import { PartInstallationsPage } from "./pages/PartInstallationsPage/PartInstallationsPage";
import { UsersPage } from "./pages/UsersPage/UsersPage";

import TeamCarsPage from "./pages/TeamCarsPage/TeamCarsPage";
import TeamCarPage from "./pages/TeamCarPage/TeamCarPage";

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
        path="/work-orders"
        element={
          <RequireRole allow={["Manager", "Mechanic"]}>
            <WorkOrdersPage />
          </RequireRole>
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
          <RequireRole allow={["Manager", "Driver"]}>
            <IssueReportsPage />
          </RequireRole>
        }
      />
      <Route
        path="/issue-reports/new"
        element={
          <RequireRole allow={["Manager", "Driver"]}>
            <NewIssueReportPage />
          </RequireRole>
        }
      />

      <Route
        path="/inventory"
        element={
          <RequireRole allow={["Manager", "PartsClerk"]}>
            <InventoryPage />
          </RequireRole>
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
        path="/parts"
        element={
          <RequireRole allow={["Manager", "PartsClerk"]}>
            <PartsPage />
          </RequireRole>
        }
      />
      <Route
        path="/inventory/movements"
        element={
          <RequireRole allow={["Manager", "PartsClerk", "Mechanic"]}>
            <InventoryMovementsPage />
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
