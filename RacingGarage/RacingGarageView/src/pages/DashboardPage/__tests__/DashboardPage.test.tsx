import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthProvider";
import DashboardPage from "../DashboardPage";
import { createMockJwt } from "@/test-utils";

interface TestUser {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
  expiresAtUtc: string;
}

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

function renderWithProviders(userOverride?: TestUser) {
  const defaultUser: TestUser = {
    userId: 1,
    firstName: "Test",
    lastName: "User",
    email: "test@example.com",
    roles: ["Manager"],
    expiresAtUtc: "2026-12-31T23:59:59Z",
  };

  localStorage.clear();
  localStorage.setItem("accessToken", createMockJwt("Test User"));
  localStorage.setItem("user", JSON.stringify(userOverride || defaultUser));

  return render(
    <MemoryRouter>
      <AuthProvider>
        <DashboardPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

function getCardByTitle(title: string): HTMLElement {
  const card = screen.getByText(title).closest("div");
  if (!card) {
    throw new Error(`Card for ${title} not found`);
  }
  return card;
}

describe("DashboardPage", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it("should render page title and subtitle", () => {
    renderWithProviders();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Choose a module to continue")).toBeInTheDocument();
  });

  it("should show all modules for Manager role", () => {
    renderWithProviders({
      userId: 1,
      firstName: "Manager",
      lastName: "User",
      email: "manager@example.com",
      roles: ["Manager"],
      expiresAtUtc: "2026-12-31T23:59:59Z",
    });

    expect(screen.getByText("Team Cars")).toBeInTheDocument();
    expect(screen.getByText("Work Orders")).toBeInTheDocument();
    expect(screen.getByText("Sessions")).toBeInTheDocument();
    expect(screen.getByText("Issue Reports")).toBeInTheDocument();
    expect(screen.getByText("Inventory")).toBeInTheDocument();
    expect(screen.getByText("Parts")).toBeInTheDocument();
    expect(screen.getByText("Suppliers")).toBeInTheDocument();
    expect(screen.getByText("Inventory Locations")).toBeInTheDocument();
    expect(screen.getByText("User Settings")).toBeInTheDocument();
    expect(screen.getByText("Users")).toBeInTheDocument();
  });

  it("should show limited modules for Driver role", () => {
    renderWithProviders({
      userId: 2,
      firstName: "Driver",
      lastName: "User",
      email: "driver@example.com",
      roles: ["Driver"],
      expiresAtUtc: "2026-12-31T23:59:59Z",
    });

    expect(screen.getByText("Team Cars")).toBeInTheDocument();
    expect(screen.getByText("Work Orders")).toBeInTheDocument();
    expect(screen.getByText("Sessions")).toBeInTheDocument();
    expect(screen.getByText("Issue Reports")).toBeInTheDocument();
    expect(screen.getByText("User Settings")).toBeInTheDocument();

    expect(screen.queryByText("Parts")).not.toBeInTheDocument();
    expect(screen.queryByText("Suppliers")).not.toBeInTheDocument();
    expect(screen.queryByText("Users")).not.toBeInTheDocument();
  });

  it("should show modules for PartsClerk role", () => {
    renderWithProviders({
      userId: 3,
      firstName: "PartsClerk",
      lastName: "User",
      email: "partsclerk@example.com",
      roles: ["PartsClerk"],
      expiresAtUtc: "2026-12-31T23:59:59Z",
    });

    expect(screen.getByText("Team Cars")).toBeInTheDocument();
    expect(screen.getByText("Work Orders")).toBeInTheDocument();
    expect(screen.getByText("Issue Reports")).toBeInTheDocument();
    expect(screen.getByText("Inventory")).toBeInTheDocument();
    expect(screen.getByText("Parts")).toBeInTheDocument();
    expect(screen.getByText("Suppliers")).toBeInTheDocument();
    expect(screen.getByText("Inventory Locations")).toBeInTheDocument();
    expect(screen.getByText("User Settings")).toBeInTheDocument();

    expect(screen.queryByText("Sessions")).not.toBeInTheDocument();
    expect(screen.queryByText("Users")).not.toBeInTheDocument();
  });

  it("should show modules for Mechanic role", () => {
    renderWithProviders({
      userId: 4,
      firstName: "Mechanic",
      lastName: "User",
      email: "mechanic@example.com",
      roles: ["Mechanic"],
      expiresAtUtc: "2026-12-31T23:59:59Z",
    });

    expect(screen.getByText("Team Cars")).toBeInTheDocument();
    expect(screen.getByText("Work Orders")).toBeInTheDocument();
    expect(screen.getByText("Sessions")).toBeInTheDocument();
    expect(screen.getByText("Issue Reports")).toBeInTheDocument();
    expect(screen.getByText("Inventory")).toBeInTheDocument();
    expect(screen.getByText("User Settings")).toBeInTheDocument();

    expect(screen.queryByText("Parts")).not.toBeInTheDocument();
    expect(screen.queryByText("Suppliers")).not.toBeInTheDocument();
    expect(screen.queryByText("Users")).not.toBeInTheDocument();
  });

  it("should show empty state for Viewer role with no access", () => {
    renderWithProviders({
      userId: 5,
      firstName: "Viewer",
      lastName: "User",
      email: "viewer@example.com",
      roles: ["Viewer"],
      expiresAtUtc: "2026-12-31T23:59:59Z",
    });

    expect(
      screen.getByText("No modules available for your role."),
    ).toBeInTheDocument();
  });

  it("should navigate on card click", () => {
    renderWithProviders();

    const teamCarsCard = getCardByTitle("Team Cars");
    fireEvent.click(teamCarsCard);

    expect(mockNavigate).toHaveBeenCalledWith("/team-cars");
  });

  it("should navigate on button click", () => {
    renderWithProviders();

    const buttons = screen.getAllByText("Open");
    fireEvent.click(buttons[0]);

    expect(mockNavigate).toHaveBeenCalledWith("/team-cars");
  });

  it("should navigate to Work Orders", () => {
    renderWithProviders();

    const workOrdersCard = getCardByTitle("Work Orders");
    fireEvent.click(workOrdersCard);

    expect(mockNavigate).toHaveBeenCalledWith("/work-orders");
  });

  it("should navigate to Sessions", () => {
    renderWithProviders();

    const sessionsCard = getCardByTitle("Sessions");
    fireEvent.click(sessionsCard);

    expect(mockNavigate).toHaveBeenCalledWith("/car-sessions");
  });

  it("should navigate to Issue Reports", () => {
    renderWithProviders();

    const issueReportsCard = getCardByTitle("Issue Reports");
    fireEvent.click(issueReportsCard);

    expect(mockNavigate).toHaveBeenCalledWith("/issue-reports");
  });

  it("should navigate to Inventory", () => {
    renderWithProviders();

    const inventoryCard = getCardByTitle("Inventory");
    fireEvent.click(inventoryCard);

    expect(mockNavigate).toHaveBeenCalledWith("/inventory");
  });

  it("should navigate to Parts", () => {
    renderWithProviders();

    const partsCard = getCardByTitle("Parts");
    fireEvent.click(partsCard);

    expect(mockNavigate).toHaveBeenCalledWith("/parts");
  });

  it("should navigate to Suppliers", () => {
    renderWithProviders();

    const suppliersCard = getCardByTitle("Suppliers");
    fireEvent.click(suppliersCard);

    expect(mockNavigate).toHaveBeenCalledWith("/suppliers");
  });

  it("should navigate to Inventory Locations", () => {
    renderWithProviders();

    const locationsCard = getCardByTitle("Inventory Locations");
    fireEvent.click(locationsCard);

    expect(mockNavigate).toHaveBeenCalledWith("/inventory-locations");
  });

  it("should navigate to User Settings", () => {
    renderWithProviders();

    const settingsCard = getCardByTitle("User Settings");
    fireEvent.click(settingsCard);

    expect(mockNavigate).toHaveBeenCalledWith("/user-settings");
  });

  it("should navigate to Users management", () => {
    renderWithProviders();

    const usersCard = getCardByTitle("Users");
    fireEvent.click(usersCard);

    expect(mockNavigate).toHaveBeenCalledWith("/users");
  });

  it("should display module descriptions", () => {
    renderWithProviders();

    expect(
      screen.getByText("Cars, status, sessions, dashboards"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Create/assign/track work orders"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("All car sessions (practice/qualifying/race logs)"),
    ).toBeInTheDocument();
  });

  it("should prevent card click propagation when button clicked", () => {
    renderWithProviders();

    const buttons = screen.getAllByText("Open");
    fireEvent.click(buttons[0]);

    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it("should show correct CTA text for Users module", () => {
    renderWithProviders();

    expect(screen.getByText("Manage")).toBeInTheDocument();
  });

  it("should show multiple modules with Manager + Mechanic roles", () => {
    renderWithProviders({
      userId: 6,
      firstName: "Multi-role",
      lastName: "User",
      email: "multirole@example.com",
      roles: ["Manager", "Mechanic"],
      expiresAtUtc: "2026-12-31T23:59:59Z",
    });

    expect(screen.getByText("Team Cars")).toBeInTheDocument();
    expect(screen.getByText("Work Orders")).toBeInTheDocument();
    expect(screen.getByText("Sessions")).toBeInTheDocument();
    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText("Inventory")).toBeInTheDocument();
  });
});
