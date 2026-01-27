namespace RacingGarage.dto;

public sealed class LaborLogReadDto
{
    public int Id { get; init; }
    public int WorkOrderTaskId { get; init; }

    public int MechanicUserId { get; init; }
    public string MechanicName { get; init; } = "";

    public int Minutes { get; init; }
    public DateOnly LogDate { get; init; }
    public string Comment { get; init; } = "";
}

public sealed class LaborLogCreateDto
{
    public int WorkOrderTaskId { get; init; }
    public int MechanicUserId { get; init; }

    public int Minutes { get; init; }
    public DateOnly LogDate { get; init; }
    public string Comment { get; init; } = "";
}

public sealed class LaborLogUpdateDto
{
    public int Minutes { get; init; }
    public DateOnly LogDate { get; init; }
    public string Comment { get; init; } = "";
}