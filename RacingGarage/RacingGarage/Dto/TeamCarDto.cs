namespace RacingGarage.dto;

public sealed class TeamCarReadDto
{
    public int Id { get; init; }
    public string CarNumber { get; init; } = "";
    public string Nickname { get; init; } = "";
    public string Make { get; init; } = "";
    public string Model { get; init; } = "";
    public int Year { get; init; }
    public string CarClass { get; init; } = "";
    public string Status { get; init; } = "";
    public int OdometerKm { get; init; }
    public DateTime CreatedAt { get; init; }
}

public sealed class TeamCarCreateDto
{
    public string CarNumber { get; init; } = "";
    public string Nickname { get; init; } = "";
    public string Make { get; init; } = "";
    public string Model { get; init; } = "";
    public int Year { get; init; }
    public string CarClass { get; init; } = "";
    public string Status { get; init; } = "Active";
    public int OdometerKm { get; init; }
}

public sealed class TeamCarUpdateDto
{
    public string CarNumber { get; init; } = "";
    public string Nickname { get; init; } = "";
    public string Make { get; init; } = "";
    public string Model { get; init; } = "";
    public int Year { get; init; }
    public string CarClass { get; init; } = "";
    public string Status { get; init; } = "Active";
    public int OdometerKm { get; init; }
}