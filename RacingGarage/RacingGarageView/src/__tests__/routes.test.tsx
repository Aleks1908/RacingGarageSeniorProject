import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthProvider";
import AppRoutes from "../routes";

interface TestUser {
  userId: number;
  name: string;
  email: string;
  roles: string[];
  expiresAtUtc: string;
}

jest.mock("../pages/LoginPage/LoginPage", () => ({
  __esModule: true,
  default: () => <div>Login Page</div>,
}));

jest.mock("../pages/DashboardPage/DashboardPage", () => ({
  __esModule: true,
  default: () => <div>Dashboard Page</div>,
}));

jest.mock("../pages/UserSettingsPage/UserSettingsPage", () => ({
  __esModule: true,
  default: () => <div>User Settings Page</div>,
}));

jest.mock("../pages/TeamCarsPage/TeamCarsPage", () => ({
  __esModule: true,
  default: () => <div>Team Cars Page</div>,
}));

jest.mock("../pages/TeamCarPage/TeamCarPage", () => ({
  __esModule: true,
  default: () => <div>Team Car Page</div>,
}));

jest.mock("../pages/CarSessionsPage/CarSessionsPage", () => ({
  __esModule: true,
  default: () => <div>Car Sessions Page</div>,
}));

jest.mock("../pages/WorkOrdersPage/WorkOrdersPage", () => ({
  __esModule: true,
  default: () => <div>Work Orders Page</div>,
}));

jest.mock("../pages/WorkOrderDetailsPage/WorkOrderDetailsPage", () => ({
  WorkOrderDetailsPage: () => <div>Work Order Details Page</div>,
}));

jest.mock("../pages/IssueReportsPage/IssueReportsPage", () => ({
  IssueReportsPage: () => <div>Issue Reports Page</div>,
}));

jest.mock("../pages/InventoryPage/InventoryPage", () => ({
  InventoryPage: () => <div>Inventory Page</div>,
}));

jest.mock("../pages/SuppliersPage/SuppliersPage", () => ({
  __esModule: true,
  default: () => <div>Suppliers Page</div>,
}));

jest.mock("../pages/InventoryLocationsPage/InventoryLocationsPage", () => ({
  __esModule: true,
  default: () => <div>Inventory Locations Page</div>,
}));

jest.mock("../pages/PartsPage/PartsPage", () => ({
  PartsPage: () => <div>Parts Page</div>,
}));

jest.mock("../pages/UsersPage/UsersPage", () => ({
  UsersPage: () => <div>Users Page</div>,
}));

function renderWithAuth(initialRoute: string, user?: TestUser | null) {
  localStorage.clear();

  if (user !== null) {
    const defaultUser: TestUser = user || {
      userId: 1,
      name: "Test User",
      email: "test@test.com",
      roles: ["Viewer"],
      expiresAtUtc: "2026-12-31T23:59:59Z",
    };

    localStorage.setItem("accessToken", "test-token");
    localStorage.setItem("user", JSON.stringify(defaultUser));
  }

  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("AppRoutes", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("Public routes", () => {
    it("renders login page at /login", () => {
      renderWithAuth("/login", null);
      expect(screen.getByText("Login Page")).toBeInTheDocument();
    });

    it("renders user settings page at /user-settings", () => {
      renderWithAuth("/user-settings", null);
      expect(screen.getByText("User Settings Page")).toBeInTheDocument();
    });
  });

  describe("Protected routes - RequireAuth", () => {
    it("redirects to login when not authenticated", async () => {
      renderWithAuth("/dashboard", null);

      await waitFor(() => {
        expect(screen.getByText("Login Page")).toBeInTheDocument();
      });
    });

    it("renders dashboard when authenticated", () => {
      renderWithAuth("/dashboard");
      expect(screen.getByText("Dashboard Page")).toBeInTheDocument();
    });

    it("renders team cars page when authenticated", () => {
      renderWithAuth("/team-cars");
      expect(screen.getByText("Team Cars Page")).toBeInTheDocument();
    });

    it("renders team car details page when authenticated", () => {
      renderWithAuth("/team-cars/1");
      expect(screen.getByText("Team Car Page")).toBeInTheDocument();
    });

    it("renders car sessions page when authenticated", () => {
      renderWithAuth("/car-sessions");
      expect(screen.getByText("Car Sessions Page")).toBeInTheDocument();
    });

    it("renders work orders page when authenticated", () => {
      renderWithAuth("/work-orders");
      expect(screen.getByText("Work Orders Page")).toBeInTheDocument();
    });

    it("renders work order details page when authenticated", () => {
      renderWithAuth("/work-orders/1");
      expect(screen.getByText("Work Order Details Page")).toBeInTheDocument();
    });

    it("renders issue reports page when authenticated", () => {
      renderWithAuth("/issue-reports");
      expect(screen.getByText("Issue Reports Page")).toBeInTheDocument();
    });

    it("renders inventory page when authenticated", () => {
      renderWithAuth("/inventory");
      expect(screen.getByText("Inventory Page")).toBeInTheDocument();
    });
  });

  describe("Protected routes - RequireRole (Manager, PartsClerk)", () => {
    it("allows Manager to access suppliers page", () => {
      renderWithAuth("/suppliers", {
        userId: 1,
        name: "Manager",
        email: "manager@test.com",
        roles: ["Manager"],
        expiresAtUtc: "2026-12-31T23:59:59Z",
      });

      expect(screen.getByText("Suppliers Page")).toBeInTheDocument();
    });

    it("allows PartsClerk to access suppliers page", () => {
      renderWithAuth("/suppliers", {
        userId: 2,
        name: "Parts Clerk",
        email: "clerk@test.com",
        roles: ["PartsClerk"],
        expiresAtUtc: "2026-12-31T23:59:59Z",
      });

      expect(screen.getByText("Suppliers Page")).toBeInTheDocument();
    });

    it("redirects non-authorized user from suppliers page", async () => {
      renderWithAuth("/suppliers", {
        userId: 3,
        name: "Viewer",
        email: "viewer@test.com",
        roles: ["Viewer"],
        expiresAtUtc: "2026-12-31T23:59:59Z",
      });

      await waitFor(() => {
        expect(screen.getByText("Dashboard Page")).toBeInTheDocument();
      });
    });

    it("allows Manager to access inventory locations page", () => {
      renderWithAuth("/inventory-locations", {
        userId: 1,
        name: "Manager",
        email: "manager@test.com",
        roles: ["Manager"],
        expiresAtUtc: "2026-12-31T23:59:59Z",
      });

      expect(screen.getByText("Inventory Locations Page")).toBeInTheDocument();
    });

    it("allows PartsClerk to access inventory locations page", () => {
      renderWithAuth("/inventory-locations", {
        userId: 2,
        name: "Parts Clerk",
        email: "clerk@test.com",
        roles: ["PartsClerk"],
        expiresAtUtc: "2026-12-31T23:59:59Z",
      });

      expect(screen.getByText("Inventory Locations Page")).toBeInTheDocument();
    });

    it("redirects non-authorized user from inventory locations page", async () => {
      renderWithAuth("/inventory-locations", {
        userId: 3,
        name: "Viewer",
        email: "viewer@test.com",
        roles: ["Viewer"],
        expiresAtUtc: "2026-12-31T23:59:59Z",
      });

      await waitFor(() => {
        expect(screen.getByText("Dashboard Page")).toBeInTheDocument();
      });
    });

    it("allows Manager to access parts page", () => {
      renderWithAuth("/parts", {
        userId: 1,
        name: "Manager",
        email: "manager@test.com",
        roles: ["Manager"],
        expiresAtUtc: "2026-12-31T23:59:59Z",
      });

      expect(screen.getByText("Parts Page")).toBeInTheDocument();
    });

    it("allows PartsClerk to access parts page", () => {
      renderWithAuth("/parts", {
        userId: 2,
        name: "Parts Clerk",
        email: "clerk@test.com",
        roles: ["PartsClerk"],
        expiresAtUtc: "2026-12-31T23:59:59Z",
      });

      expect(screen.getByText("Parts Page")).toBeInTheDocument();
    });

    it("redirects non-authorized user from parts page", async () => {
      renderWithAuth("/parts", {
        userId: 3,
        name: "Viewer",
        email: "viewer@test.com",
        roles: ["Viewer"],
        expiresAtUtc: "2026-12-31T23:59:59Z",
      });

      await waitFor(() => {
        expect(screen.getByText("Dashboard Page")).toBeInTheDocument();
      });
    });
  });

  describe("Protected routes - RequireRole (Manager only)", () => {
    it("allows Manager to access users page", () => {
      renderWithAuth("/users", {
        userId: 1,
        name: "Manager",
        email: "manager@test.com",
        roles: ["Manager"],
        expiresAtUtc: "2026-12-31T23:59:59Z",
      });

      expect(screen.getByText("Users Page")).toBeInTheDocument();
    });

    it("redirects non-Manager from users page", async () => {
      renderWithAuth("/users", {
        userId: 2,
        name: "Parts Clerk",
        email: "clerk@test.com",
        roles: ["PartsClerk"],
        expiresAtUtc: "2026-12-31T23:59:59Z",
      });

      await waitFor(() => {
        expect(screen.getByText("Dashboard Page")).toBeInTheDocument();
      });
    });

    it("redirects unauthenticated user from users page", async () => {
      renderWithAuth("/users", null);

      await waitFor(() => {
        expect(screen.getByText("Login Page")).toBeInTheDocument();
      });
    });
  });

  describe("Redirects", () => {
    it("redirects root path to dashboard when authenticated", async () => {
      renderWithAuth("/");

      await waitFor(() => {
        expect(screen.getByText("Dashboard Page")).toBeInTheDocument();
      });
    });

    it("redirects root path to login when not authenticated", async () => {
      renderWithAuth("/", null);

      await waitFor(() => {
        expect(screen.getByText("Login Page")).toBeInTheDocument();
      });
    });

    it("redirects unknown path to dashboard when authenticated", async () => {
      renderWithAuth("/unknown-route");

      await waitFor(() => {
        expect(screen.getByText("Dashboard Page")).toBeInTheDocument();
      });
    });

    it("redirects unknown path to login when not authenticated", async () => {
      renderWithAuth("/unknown-route", null);

      await waitFor(() => {
        expect(screen.getByText("Login Page")).toBeInTheDocument();
      });
    });
  });

  describe("Multi-role access", () => {
    it("allows user with multiple roles including Manager to access restricted pages", () => {
      renderWithAuth("/users", {
        userId: 1,
        name: "Admin",
        email: "admin@test.com",
        roles: ["Manager", "PartsClerk", "Mechanic"],
        expiresAtUtc: "2026-12-31T23:59:59Z",
      });

      expect(screen.getByText("Users Page")).toBeInTheDocument();
    });

    it("allows user with multiple roles including PartsClerk to access parts page", () => {
      renderWithAuth("/parts", {
        userId: 2,
        name: "Multi Role",
        email: "multi@test.com",
        roles: ["Mechanic", "PartsClerk"],
        expiresAtUtc: "2026-12-31T23:59:59Z",
      });

      expect(screen.getByText("Parts Page")).toBeInTheDocument();
    });
  });
});
