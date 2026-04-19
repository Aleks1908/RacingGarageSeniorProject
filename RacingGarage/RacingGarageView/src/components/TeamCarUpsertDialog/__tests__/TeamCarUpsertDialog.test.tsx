import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TeamCarUpsertDialog } from "../TeamCarUpsertDialog";
import { createTeamCar, updateTeamCar } from "@/api/teamCars";

jest.mock("@/api/teamCars");

const mockOnOpenChange = jest.fn();
const mockOnSaved = jest.fn();

const mockCar = {
  id: 1,
  carNumber: "42",
  nickname: "Red Devil",
  make: "Ferrari",
  model: "488 GT3",
  year: 2022,
  carClass: "GT3",
  status: "Active",
  odometerKm: 15000,
  createdAt: "2024-01-01T00:00:00Z",
  isActive: true,
};

describe("TeamCarUpsertDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.alert = jest.fn();
  });

  it("should render create dialog when not editing", () => {
    render(
      <TeamCarUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        onSaved={mockOnSaved}
      />
    );

    expect(
      screen.getByRole("heading", { name: "New Car" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create Car" })
    ).toBeInTheDocument();
  });

  it("should render edit dialog when editing", () => {
    render(
      <TeamCarUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={mockCar}
        onSaved={mockOnSaved}
      />
    );

    expect(
      screen.getByRole("heading", { name: "Edit Car" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save Changes" })
    ).toBeInTheDocument();
  });

  it("should close dialog on cancel", () => {
    render(
      <TeamCarUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        onSaved={mockOnSaved}
      />
    );

    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    fireEvent.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("should disable form when disabled prop is true", () => {
    render(
      <TeamCarUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        onSaved={mockOnSaved}
        disabled={true}
      />
    );

    expect(screen.getByRole("button", { name: "Create Car" })).toBeDisabled();
  });

  it("should validate required fields", async () => {
    render(
      <TeamCarUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        onSaved={mockOnSaved}
      />
    );

    const submitButton = screen.getByRole("button", { name: "Create Car" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Car number is required")).toBeInTheDocument();
    });
  });

  it("should successfully create a new car", async () => {
    (createTeamCar as jest.Mock).mockResolvedValueOnce({});

    render(
      <TeamCarUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        onSaved={mockOnSaved}
      />
    );

    fireEvent.change(screen.getByPlaceholderText("e.g. 27"), {
      target: { value: "99" },
    });
    fireEvent.change(screen.getByPlaceholderText("BMW"), {
      target: { value: "Porsche" },
    });
    fireEvent.change(screen.getByPlaceholderText("E46"), {
      target: { value: "911" },
    });
    fireEvent.change(screen.getByPlaceholderText("2025"), {
      target: { value: "2023" },
    });
    fireEvent.change(screen.getByPlaceholderText("GT4 / Time Attack / ..."), {
      target: { value: "GT3" },
    });
    fireEvent.change(screen.getByPlaceholderText("e.g. 120000"), {
      target: { value: "50000" },
    });

    const submitButton = screen.getByRole("button", { name: "Create Car" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(createTeamCar).toHaveBeenCalledWith({
        carNumber: "99",
        nickname: "",
        make: "Porsche",
        model: "911",
        year: 2023,
        carClass: "GT3",
        status: "Active",
        odometerKm: 50000,
      });
    });

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    expect(mockOnSaved).toHaveBeenCalled();
  });

  it("should successfully update an existing car", async () => {
    (updateTeamCar as jest.Mock).mockResolvedValueOnce({});

    render(
      <TeamCarUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={mockCar}
        onSaved={mockOnSaved}
      />
    );

    const carNumberInput = screen.getByDisplayValue("42");
    fireEvent.change(carNumberInput, { target: { value: "43" } });

    const submitButton = screen.getByRole("button", { name: "Save Changes" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(updateTeamCar).toHaveBeenCalledWith(1, {
        carNumber: "43",
        nickname: "Red Devil",
        make: "Ferrari",
        model: "488 GT3",
        year: 2022,
        carClass: "GT3",
        status: "Active",
        odometerKm: 15000,
      });
    });

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    expect(mockOnSaved).toHaveBeenCalled();
  });

  it("should handle year validation error", async () => {
    render(
      <TeamCarUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        onSaved={mockOnSaved}
      />
    );

    fireEvent.change(screen.getByPlaceholderText("e.g. 27"), {
      target: { value: "99" },
    });
    fireEvent.change(screen.getByPlaceholderText("BMW"), {
      target: { value: "Porsche" },
    });
    fireEvent.change(screen.getByPlaceholderText("E46"), {
      target: { value: "911" },
    });
    fireEvent.change(screen.getByPlaceholderText("2025"), {
      target: { value: "1900" },
    });
    fireEvent.change(screen.getByPlaceholderText("GT4 / Time Attack / ..."), {
      target: { value: "GT3" },
    });
    fireEvent.change(screen.getByPlaceholderText("e.g. 120000"), {
      target: { value: "50000" },
    });

    const submitButton = screen.getByRole("button", { name: "Create Car" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Year looks too low")).toBeInTheDocument();
    });

    expect(createTeamCar).not.toHaveBeenCalled();
  });

  it("should handle negative odometer validation error", async () => {
    render(
      <TeamCarUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        onSaved={mockOnSaved}
      />
    );

    fireEvent.change(screen.getByPlaceholderText("e.g. 27"), {
      target: { value: "99" },
    });
    fireEvent.change(screen.getByPlaceholderText("BMW"), {
      target: { value: "Porsche" },
    });
    fireEvent.change(screen.getByPlaceholderText("E46"), {
      target: { value: "911" },
    });
    fireEvent.change(screen.getByPlaceholderText("2025"), {
      target: { value: "2023" },
    });
    fireEvent.change(screen.getByPlaceholderText("GT4 / Time Attack / ..."), {
      target: { value: "GT3" },
    });
    fireEvent.change(screen.getByPlaceholderText("e.g. 120000"), {
      target: { value: "-1000" },
    });

    const submitButton = screen.getByRole("button", { name: "Create Car" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith("Odometer cannot be negative.");
    });

    expect(createTeamCar).not.toHaveBeenCalled();
  });

  it("should handle API error on create", async () => {
    (createTeamCar as jest.Mock).mockRejectedValueOnce(
      new Error("Network error")
    );

    render(
      <TeamCarUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        onSaved={mockOnSaved}
      />
    );

    fireEvent.change(screen.getByPlaceholderText("e.g. 27"), {
      target: { value: "99" },
    });
    fireEvent.change(screen.getByPlaceholderText("BMW"), {
      target: { value: "Porsche" },
    });
    fireEvent.change(screen.getByPlaceholderText("E46"), {
      target: { value: "911" },
    });
    fireEvent.change(screen.getByPlaceholderText("2025"), {
      target: { value: "2023" },
    });
    fireEvent.change(screen.getByPlaceholderText("GT4 / Time Attack / ..."), {
      target: { value: "GT3" },
    });
    fireEvent.change(screen.getByPlaceholderText("e.g. 120000"), {
      target: { value: "50000" },
    });

    const submitButton = screen.getByRole("button", { name: "Create Car" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith("Network error");
    });

    expect(mockOnOpenChange).not.toHaveBeenCalled();
  });

  it("should handle API error on update", async () => {
    (updateTeamCar as jest.Mock).mockRejectedValueOnce(
      new Error("Update failed")
    );

    render(
      <TeamCarUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={mockCar}
        onSaved={mockOnSaved}
      />
    );

    const submitButton = screen.getByRole("button", { name: "Save Changes" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith("Update failed");
    });

    expect(mockOnOpenChange).not.toHaveBeenCalled();
  });

  it("should populate form when opening in edit mode", () => {
    render(
      <TeamCarUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={mockCar}
        onSaved={mockOnSaved}
      />
    );

    expect(screen.getByDisplayValue("42")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Red Devil")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Ferrari")).toBeInTheDocument();
    expect(screen.getByDisplayValue("488 GT3")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2022")).toBeInTheDocument();
    expect(screen.getByDisplayValue("GT3")).toBeInTheDocument();
    expect(screen.getByDisplayValue("15000")).toBeInTheDocument();
  });

  it("should reset form when opening in create mode", () => {
    const { rerender } = render(
      <TeamCarUpsertDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        editing={null}
        onSaved={mockOnSaved}
      />
    );

    rerender(
      <TeamCarUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        onSaved={mockOnSaved}
      />
    );

    expect(screen.getByPlaceholderText("e.g. 27")).toHaveValue("");
    expect(screen.getByPlaceholderText("BMW")).toHaveValue("");
    expect(screen.getByPlaceholderText("E46")).toHaveValue("");
  });

  it("should create car with nickname and optional fields", async () => {
    (createTeamCar as jest.Mock).mockResolvedValueOnce({});

    render(
      <TeamCarUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        onSaved={mockOnSaved}
      />
    );

    fireEvent.change(screen.getByPlaceholderText("e.g. 27"), {
      target: { value: "55" },
    });
    fireEvent.change(screen.getByPlaceholderText("e.g. The Rocket"), {
      target: { value: "Lightning" },
    });
    fireEvent.change(screen.getByPlaceholderText("BMW"), {
      target: { value: "McLaren" },
    });
    fireEvent.change(screen.getByPlaceholderText("E46"), {
      target: { value: "720S" },
    });
    fireEvent.change(screen.getByPlaceholderText("2025"), {
      target: { value: "2021" },
    });
    fireEvent.change(screen.getByPlaceholderText("GT4 / Time Attack / ..."), {
      target: { value: "GT4" },
    });
    fireEvent.change(screen.getByPlaceholderText("e.g. 120000"), {
      target: { value: "25000" },
    });

    const submitButton = screen.getByRole("button", { name: "Create Car" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(createTeamCar).toHaveBeenCalledWith({
        carNumber: "55",
        nickname: "Lightning",
        make: "McLaren",
        model: "720S",
        year: 2021,
        carClass: "GT4",
        status: "Active",
        odometerKm: 25000,
      });
    });
  });

  it("should validate odometer as required field", async () => {
    render(
      <TeamCarUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        onSaved={mockOnSaved}
      />
    );

    fireEvent.change(screen.getByPlaceholderText("e.g. 27"), {
      target: { value: "77" },
    });
    fireEvent.change(screen.getByPlaceholderText("BMW"), {
      target: { value: "Audi" },
    });
    fireEvent.change(screen.getByPlaceholderText("E46"), {
      target: { value: "R8" },
    });
    fireEvent.change(screen.getByPlaceholderText("2025"), {
      target: { value: "2024" },
    });
    fireEvent.change(screen.getByPlaceholderText("GT4 / Time Attack / ..."), {
      target: { value: "GT3" },
    });
    fireEvent.change(screen.getByPlaceholderText("e.g. 120000"), {
      target: { value: "" },
    });

    const submitButton = screen.getByRole("button", { name: "Create Car" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Odometer is required")).toBeInTheDocument();
    });

    expect(createTeamCar).not.toHaveBeenCalled();
  });

  it("should trim whitespace from text fields", async () => {
    (createTeamCar as jest.Mock).mockResolvedValueOnce({});

    render(
      <TeamCarUpsertDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editing={null}
        onSaved={mockOnSaved}
      />
    );

    fireEvent.change(screen.getByPlaceholderText("e.g. 27"), {
      target: { value: "  88  " },
    });
    fireEvent.change(screen.getByPlaceholderText("e.g. The Rocket"), {
      target: { value: "  Fast Car  " },
    });
    fireEvent.change(screen.getByPlaceholderText("BMW"), {
      target: { value: "  Mercedes  " },
    });
    fireEvent.change(screen.getByPlaceholderText("E46"), {
      target: { value: "  AMG GT3  " },
    });
    fireEvent.change(screen.getByPlaceholderText("2025"), {
      target: { value: "2023" },
    });
    fireEvent.change(screen.getByPlaceholderText("GT4 / Time Attack / ..."), {
      target: { value: "  GT3  " },
    });
    fireEvent.change(screen.getByPlaceholderText("e.g. 120000"), {
      target: { value: "30000" },
    });

    const submitButton = screen.getByRole("button", { name: "Create Car" });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(createTeamCar).toHaveBeenCalledWith({
        carNumber: "88",
        nickname: "Fast Car",
        make: "Mercedes",
        model: "AMG GT3",
        year: 2023,
        carClass: "GT3",
        status: "Active",
        odometerKm: 30000,
      });
    });
  });
});
