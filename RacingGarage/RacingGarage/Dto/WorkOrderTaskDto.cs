namespace RacingGarage.dto;

public sealed class WorkOrderTaskReadDto
{
    public int Id { get; init; }
    public int WorkOrderId { get; init; }

    public string Title { get; init; } = "";
    public string Description { get; init; } = "";

    public string Status { get; init; } = "";
    public int SortOrder { get; init; }

    public int? EstimatedMinutes { get; init; }
    public DateTime? CompletedAt { get; init; }
}

public sealed class WorkOrderTaskCreateDto
{
    public int WorkOrderId { get; init; }

    public string Title { get; init; } = "";
    public string Description { get; init; } = "";

    public string Status { get; init; } = "Todo";
    public int SortOrder { get; init; }

    public int? EstimatedMinutes { get; init; }
}

public sealed class WorkOrderTaskUpdateDto
{
    public string Title { get; init; } = "";
    public string Description { get; init; } = "";

    public string Status { get; init; } = "Todo";
    public int SortOrder { get; init; }

    public int? EstimatedMinutes { get; init; }
    public DateTime? CompletedAt { get; init; }
}