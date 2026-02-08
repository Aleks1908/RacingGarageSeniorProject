namespace RacingGarage.dto;

public sealed class TeamCarDashboardDto
{
    public TeamCarSummaryDto Car { get; init; } = null!;
    public CarSessionReadDto? LatestSession { get; init; }

    public List<IssueReportReadDto> OpenIssues { get; init; } = new();
    public List<WorkOrderReadDto> OpenWorkOrders { get; init; } = new();
}