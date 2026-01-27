namespace RacingGarage.dto;

public sealed class IssueReportReadDto
{
    public int Id { get; init; }

    public int TeamCarId { get; init; }
    public string TeamCarNumber { get; init; } = "";

    public int? CarSessionId { get; init; }

    public int ReportedByUserId { get; init; }
    public string ReportedByName { get; init; } = "";

    public int? LinkedWorkOrderId { get; init; }

    public string Title { get; init; } = "";
    public string Description { get; init; } = "";

    public string Severity { get; init; } = "";
    public string Status { get; init; } = "";

    public DateTime ReportedAt { get; init; }
    public DateTime? ClosedAt { get; init; }
}

public sealed class IssueReportCreateDto
{
    public int TeamCarId { get; init; }
    public int? CarSessionId { get; init; }

    public int ReportedByUserId { get; init; }

    public string Title { get; init; } = "";
    public string Description { get; init; } = "";

    public string Severity { get; init; } = "Medium";
    public string Status { get; init; } = "Open";
}

public sealed class IssueReportUpdateDto
{
    public int TeamCarId { get; init; }
    public int? CarSessionId { get; init; }

    public string Title { get; init; } = "";
    public string Description { get; init; } = "";

    public string Severity { get; init; } = "Medium";
    public string Status { get; init; } = "Open";

    public int? LinkedWorkOrderId { get; init; }
    public DateTime? ClosedAt { get; init; }
}