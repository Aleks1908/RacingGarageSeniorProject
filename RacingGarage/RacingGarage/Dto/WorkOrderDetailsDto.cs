namespace RacingGarage.dto;

public sealed class WorkOrderDetailsDto
{
    public WorkOrderReadDto WorkOrder { get; init; } = null!;
    public List<WorkOrderTaskReadDto> Tasks { get; init; } = new();
    public List<LaborLogReadDto> LaborLogs { get; init; } = new();
    public List<PartInstallationReadDto> PartInstallations { get; init; } = new();

    public int TotalLaborMinutes { get; init; }
    public int TotalInstalledPartsQty { get; init; }
}