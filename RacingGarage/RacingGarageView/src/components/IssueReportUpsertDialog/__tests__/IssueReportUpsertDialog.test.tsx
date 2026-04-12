import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IssueReportUpsertDialog } from "../IssueReportUpsertDialog";
import { createIssueReport, updateIssueReport } from "@/api/issueReports";
import { listCarSessionsForCar } from "@/api/carSessions";

jest.mock("@/api/issueReports");
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

const mockSessions = [
  {
    id: 1,
    teamCarId: 1,
    date: "2024-01-15T10:00:00Z",
    sessionType: "Practice",
    trackName: "Monza",
    createdAt: "2024-01-15T10:00:00Z",
  },
  {
    id: 2,
    teamCarId: 1,
    date: "2024-01-10T10:00:00Z",
    sessionType: "Race",
    trackName: "Spa",
    createdAt: "2024-01-10T10:00:00Z",
  },
];

const mockIssue = {
  id: 1,
  teamCarId: 1,
  teamCarNumber: "42",
  carSessionId: 1,
  reportedByUserId: 1,
  reportedByName: "John Doe",
  title: "Brake Issue",
  description: "Brake vibration",
  severity: "High",
  status: "Open",
  linkedWorkOrderId: null,
  reportedAt: "2024-01-01T00:00:00Z",
  closedAt: null,
  createdAt: "2024-01-01T00:00:00Z",
};

describe("IssueReportUpsertDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (listCarSessionsForCar as jest.Mock).mockResolvedValue(mockSessions);
  });

  it("should render create dialog when not editing", () => {
    render(
      <IssueReportUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        cars={mockCars}
        currentUserId={1}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    expect(
      screen.getByRole("heading", { name: "New Issue Report" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create Issue" })
    ).toBeInTheDocument();
  });

  it("should render edit dialog when editing", async () => {
    render(
      <IssueReportUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={mockIssue}
        cars={mockCars}
        currentUserId={1}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Edit Issue #1" })
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: "Save Changes" })
    ).toBeInTheDocument();
  });

  it("should close dialog on cancel", () => {
    render(
      <IssueReportUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        cars={mockCars}
        currentUserId={1}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    fireEvent.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("should lock car when editing", async () => {
    render(
      <IssueReportUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={mockIssue}
        cars={mockCars}
        currentUserId={1}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/#42 — Ferrari488 GT3/)).toBeInTheDocument();
    });
  });

  it("should lock car when only one car available", () => {
    render(
      <IssueReportUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        cars={[mockCars[0]]}
        currentUserId={1}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    expect(screen.getByText(/#42 — Ferrari488 GT3/)).toBeInTheDocument();
  });

  it("should validate car is required", async () => {
    render(
      <IssueReportUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        cars={mockCars}
        currentUserId={1}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    const titleInput = screen.getByPlaceholderText(/e.g. Brake vibration/i);
    await userEvent.type(titleInput, "Test Issue");

    const submitButton = screen.getByRole("button", { name: "Create Issue" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/select a car/i)).toBeInTheDocument();
    });
  });

  it("should validate title is required", async () => {
    render(
      <IssueReportUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        cars={[mockCars[0]]}
        currentUserId={1}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    const submitButton = screen.getByRole("button", { name: "Create Issue" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument();
    });
  });

  it("should create new issue successfully", async () => {
    (createIssueReport as jest.Mock).mockResolvedValue({ id: 2 });

    render(
      <IssueReportUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        cars={mockCars}
        currentUserId={1}
        canEdit={true}
        onSaved={mockOnSaved}
        defaultTeamCarId={1}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "New Issue Report" })
      ).toBeInTheDocument();
    });

    const titleInput = screen.getByPlaceholderText(/e.g. Brake vibration/i);
    await userEvent.type(titleInput, "New Issue");

    const descInput = screen.getByPlaceholderText(/Optional/i);
    await userEvent.type(descInput, "Test description");

    const submitButton = screen.getByRole("button", { name: "Create Issue" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(createIssueReport).toHaveBeenCalledWith(
        expect.objectContaining({
          teamCarId: 1,
          reportedByUserId: 1,
          title: "New Issue",
          description: "Test description",
          severity: "Medium",
          status: "Open",
        })
      );
    });

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    expect(mockOnSaved).toHaveBeenCalled();
  });

  it("should update existing issue successfully", async () => {
    (updateIssueReport as jest.Mock).mockResolvedValue({});

    render(
      <IssueReportUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={mockIssue}
        cars={mockCars}
        currentUserId={1}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("Brake Issue")).toBeInTheDocument();
    });

    const titleInput = screen.getByDisplayValue("Brake Issue");
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "Updated Issue");

    const submitButton = screen.getByRole("button", { name: "Save Changes" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(updateIssueReport).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          title: "Updated Issue",
        })
      );
    });

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    expect(mockOnSaved).toHaveBeenCalled();
  });

  it("should handle API error on create", async () => {
    const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});
    (createIssueReport as jest.Mock).mockRejectedValue(
      new Error("Creation failed")
    );

    render(
      <IssueReportUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        cars={mockCars}
        currentUserId={1}
        canEdit={true}
        onSaved={mockOnSaved}
        defaultTeamCarId={1}
      />
    );

    const titleInput = await screen.findByPlaceholderText(
      /e.g. Brake vibration/i
    );
    await userEvent.type(titleInput, "Test");

    const submitButton = screen.getByRole("button", { name: "Create Issue" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Creation failed");
    });

    alertSpy.mockRestore();
  });

  it("should handle API error on update", async () => {
    const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});
    (updateIssueReport as jest.Mock).mockRejectedValue(
      new Error("Update failed")
    );

    render(
      <IssueReportUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={mockIssue}
        cars={mockCars}
        currentUserId={1}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("Brake Issue")).toBeInTheDocument();
    });

    const submitButton = screen.getByRole("button", { name: "Save Changes" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Update failed");
    });

    alertSpy.mockRestore();
  });

  it("should load sessions when car is selected", async () => {
    render(
      <IssueReportUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        cars={mockCars}
        currentUserId={1}
        canEdit={true}
        onSaved={mockOnSaved}
        defaultTeamCarId={1}
      />
    );

    await screen.findByRole("heading", { name: "New Issue Report" });

    await waitFor(() => {
      expect(listCarSessionsForCar).toHaveBeenCalledWith(1);
    });
  });

  it("should handle session loading error", async () => {
    (listCarSessionsForCar as jest.Mock).mockRejectedValue(
      new Error("Failed to load")
    );

    render(
      <IssueReportUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        cars={mockCars}
        currentUserId={1}
        canEdit={true}
        onSaved={mockOnSaved}
        defaultTeamCarId={1}
      />
    );

    const titleInput = await screen.findByPlaceholderText(
      /e.g. Brake vibration/i
    );
    expect(titleInput).toBeInTheDocument();
  });

  it("should show no sessions message when car has no sessions", async () => {
    (listCarSessionsForCar as jest.Mock).mockResolvedValue([]);

    render(
      <IssueReportUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        cars={mockCars}
        currentUserId={1}
        canEdit={true}
        onSaved={mockOnSaved}
        defaultTeamCarId={1}
      />
    );

    await screen.findByText(/no sessions found for this car/i);
    expect(
      screen.getByText(/no sessions found for this car/i)
    ).toBeInTheDocument();
  });

  it("should populate form with edit data", async () => {
    render(
      <IssueReportUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={mockIssue}
        cars={mockCars}
        currentUserId={1}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("Brake Issue")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Brake vibration")).toBeInTheDocument();
    });
  });

  it("should use defaultTeamCarId when provided", () => {
    render(
      <IssueReportUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        cars={mockCars}
        currentUserId={1}
        canEdit={true}
        onSaved={mockOnSaved}
        defaultTeamCarId={2}
      />
    );

    expect(listCarSessionsForCar).toHaveBeenCalledWith(2);
  });

  it("should show permission message when editing without canEdit", async () => {
    render(
      <IssueReportUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={mockIssue}
        cars={mockCars}
        currentUserId={1}
        canEdit={false}
        onSaved={mockOnSaved}
      />
    );

    await waitFor(
      () => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it("should handle status change when editing", async () => {
    (updateIssueReport as jest.Mock).mockResolvedValue({});

    render(
      <IssueReportUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={mockIssue}
        cars={mockCars}
        currentUserId={1}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("Brake Issue")).toBeInTheDocument();
    });

    const submitButton = screen.getByRole("button", { name: "Save Changes" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(updateIssueReport).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          status: "Open",
        })
      );
    });
  });

  it("should not render when closed", () => {
    const { container } = render(
      <IssueReportUpsertDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        editing={null}
        cars={mockCars}
        currentUserId={1}
        canEdit={true}
        onSaved={mockOnSaved}
      />
    );

    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
  });
});
