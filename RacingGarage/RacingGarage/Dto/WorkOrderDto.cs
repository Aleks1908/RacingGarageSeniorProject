namespace RacingGarage.dto;

public sealed class WorkOrderReadDto
{
    public int Id { get; init; }

    public int TeamCarId { get; init; }
    public string TeamCarNumber { get; init; } = "";

    public int CreatedByUserId { get; init; }
    public string CreatedByName { get; init; } = "";

    public int? AssignedToUserId { get; init; }
    public string? AssignedToName { get; init; }

    public int? CarSessionId { get; init; }

    public string Title { get; init; } = "";
    public string Description { get; init; } = "";

    public string Priority { get; init; } = "";
    public string Status { get; init; } = "";

    public DateTime CreatedAt { get; init; }
    public DateTime? DueDate { get; init; }
    public DateTime? ClosedAt { get; init; }
}

public sealed class WorkOrderCreateDto
{
    public int TeamCarId { get; init; }
    public int CreatedByUserId { get; init; }

    public int? AssignedToUserId { get; init; }
    public int? CarSessionId { get; init; }

    public string Title { get; init; } = "";
    public string Description { get; init; } = "";

    public string Priority { get; init; } = "Medium";
    public string Status { get; init; } = "Open";

    public DateTime? DueDate { get; init; }
}

public sealed class WorkOrderUpdateDto
{
    public int TeamCarId { get; init; }

    public int? AssignedToUserId { get; init; }
    public int? CarSessionId { get; init; }

    public string Title { get; init; } = "";
    public string Description { get; init; } = "";

    public string Priority { get; init; } = "Medium";
    public string Status { get; init; } = "Open";

    public DateTime? DueDate { get; init; }
    public DateTime? ClosedAt { get; init; }
}