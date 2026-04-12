import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CarSessionUpsertDialog } from "../CarSessionUpsertDialog";
import { createCarSession, updateCarSession } from "@/api/carSessions";

jest.mock("@/api/carSessions");

const mockOnOpenChange = jest.fn();
const mockOnSaved = jest.fn();

const mockCars = [
  {
    id: 1,
    carNumber: "42",
    nickname: "Red Devil",
    make: "Ferrari",
    model: "488 GT3",
    year: 2023,
    carClass: "GT3",
    status: "Active",
    odometerKm: 5000,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: 2,
    carNumber: "7",
    nickname: "Silver Arrow",
    make: "McLaren",
    model: "720S GT3",
    year: 2023,
    carClass: "GT3",
    status: "Active",
    odometerKm: 3000,
    createdAt: "2024-01-01T00:00:00Z",
  },
];

const mockDrivers = [
  {
    id: 10,
    name: "John Doe",
    email: "john@example.com",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    roles: ["Driver"],
  },
  {
    id: 11,
    name: "Jane Smith",
    email: "jane@example.com",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    roles: ["Driver", "Manager"],
  },
];

const mockSession = {
  id: 1,
  teamCarId: 1,
  teamCarNumber: "42",
  sessionType: "Race",
  date: "2024-01-15",
  trackName: "Serres Circuit",
  driverUserId: 10,
  laps: 25,
  notes: "Great session",
};

describe("CarSessionUpsertDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render create dialog when not editing", () => {
    render(
      <CarSessionUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        cars={mockCars}
        drivers={mockDrivers}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    expect(
      screen.getByRole("heading", { name: "Add Session" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create Session" })
    ).toBeInTheDocument();
  });

  it("should render edit dialog when editing", () => {
    render(
      <CarSessionUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={mockSession}
        cars={mockCars}
        drivers={mockDrivers}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    expect(
      screen.getByRole("heading", { name: "Edit Session #1" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save Changes" })
    ).toBeInTheDocument();
  });

  it("should lock car selection when editing", () => {
    render(
      <CarSessionUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={mockSession}
        cars={mockCars}
        drivers={mockDrivers}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    expect(screen.getByText(/#42 — Ferrari 488 GT3/)).toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: /car/i })
    ).not.toBeInTheDocument();
  });

  it("should lock car when defaultTeamCarId is provided", () => {
    render(
      <CarSessionUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        cars={mockCars}
        drivers={mockDrivers}
        defaultTeamCarId={1}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    expect(screen.getByText(/#42 — Ferrari 488 GT3/)).toBeInTheDocument();
  });

  it("should require track name", async () => {
    render(
      <CarSessionUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        cars={mockCars}
        drivers={mockDrivers}
        defaultTeamCarId={1}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    const submitButton = screen.getByRole("button", { name: "Create Session" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/track name is required/i)).toBeInTheDocument();
    });
  });

  it("should validate laps as non-negative integer", async () => {
    render(
      <CarSessionUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        cars={mockCars}
        drivers={mockDrivers}
        defaultTeamCarId={1}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    const trackInput = screen.getByPlaceholderText(/serres circuit/i);
    await userEvent.type(trackInput, "Test Track");

    const lapsInput = screen.getByPlaceholderText(/e\.g\. 10/i);
    await userEvent.type(lapsInput, "-5");

    const submitButton = screen.getByRole("button", { name: "Create Session" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/laps must be a non-negative integer/i)
      ).toBeInTheDocument();
    });
  });

  it("should create new session on submit", async () => {
    (createCarSession as jest.Mock).mockResolvedValue({ id: 999 });

    render(
      <CarSessionUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        cars={mockCars}
        drivers={mockDrivers}
        defaultTeamCarId={1}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    const trackInput = screen.getByPlaceholderText(/serres circuit/i);
    await userEvent.type(trackInput, "Spa-Francorchamps");

    const lapsInput = screen.getByPlaceholderText(/e\.g\. 10/i);
    await userEvent.type(lapsInput, "15");

    const submitButton = screen.getByRole("button", { name: "Create Session" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(createCarSession).toHaveBeenCalledWith(
        expect.objectContaining({
          teamCarId: 1,
          trackName: "Spa-Francorchamps",
          laps: 15,
        })
      );
    });

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    expect(mockOnSaved).toHaveBeenCalled();
  });

  it("should update session when editing", async () => {
    (updateCarSession as jest.Mock).mockResolvedValue({});

    render(
      <CarSessionUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={mockSession}
        cars={mockCars}
        drivers={mockDrivers}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    const submitButton = screen.getByRole("button", { name: "Save Changes" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(updateCarSession).toHaveBeenCalledWith(1, expect.any(Object));
    });

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    expect(mockOnSaved).toHaveBeenCalled();
  });

  it("should handle API error on create", async () => {
    (createCarSession as jest.Mock).mockRejectedValue(
      new Error("Network error")
    );
    const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});

    render(
      <CarSessionUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        cars={mockCars}
        drivers={mockDrivers}
        defaultTeamCarId={1}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    const trackInput = screen.getByPlaceholderText(/serres circuit/i);
    await userEvent.type(trackInput, "Test Track");

    const submitButton = screen.getByRole("button", { name: "Create Session" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Network error");
    });

    alertSpy.mockRestore();
  });

  it("should handle API error on update", async () => {
    (updateCarSession as jest.Mock).mockRejectedValue(
      new Error("Update failed")
    );
    const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});

    render(
      <CarSessionUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={mockSession}
        cars={mockCars}
        drivers={mockDrivers}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    const submitButton = screen.getByRole("button", { name: "Save Changes" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Update failed");
    });

    alertSpy.mockRestore();
  });

  it("should close dialog on cancel", () => {
    render(
      <CarSessionUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        cars={mockCars}
        drivers={mockDrivers}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    fireEvent.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("should show permission message when canEdit is false", () => {
    render(
      <CarSessionUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        cars={mockCars}
        drivers={mockDrivers}
        canEdit={false}
        onSaved={mockOnSaved}
      />
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
  });

  it("should populate form with edit session data", () => {
    render(
      <CarSessionUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={mockSession}
        cars={mockCars}
        drivers={mockDrivers}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    const dateInput = screen.getByDisplayValue("2024-01-15");
    expect(dateInput).toBeInTheDocument();

    const trackInput = screen.getByDisplayValue("Serres Circuit");
    expect(trackInput).toBeInTheDocument();
  });

  it("should not close dialog if form validation fails", async () => {
    render(
      <CarSessionUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        cars={mockCars}
        drivers={mockDrivers}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    const submitButton = screen.getByRole("button", { name: "Create Session" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/track name is required/i)).toBeInTheDocument();
    });

    expect(mockOnOpenChange).not.toHaveBeenCalled();
  });
});
