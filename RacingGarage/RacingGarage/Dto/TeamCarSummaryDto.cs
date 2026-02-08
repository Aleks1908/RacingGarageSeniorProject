namespace RacingGarage.dto;

public sealed class TeamCarSummaryDto
{
    public int Id { get; init; }
    public string CarNumber { get; init; } = "";
    public string Make { get; init; } = "";
    public string Model { get; init; } = "";
    public int Year { get; init; }
    public string Status { get; init; } = "";
}