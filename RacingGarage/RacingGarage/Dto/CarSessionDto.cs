namespace RacingGarage.dto;

public sealed class CarSessionReadDto
{
    public int Id { get; init; }

    public int TeamCarId { get; init; }
    public string TeamCarNumber { get; init; } = "";

    public string SessionType { get; init; } = "";
    public DateOnly Date { get; init; }
    public string TrackName { get; init; } = "";

    public int? DriverUserId { get; init; }
    public string? DriverName { get; init; }

    public int Laps { get; init; }
    public string Notes { get; init; } = "";
}

// Create DTO
public sealed class CarSessionCreateDto
{
    public int TeamCarId { get; init; }

    public string SessionType { get; init; } = "Practice";
    public DateOnly Date { get; init; }
    public string TrackName { get; init; } = "";

    public int? DriverUserId { get; init; }

    public int Laps { get; init; }
    public string Notes { get; init; } = "";
}

// Update DTO 
public sealed class CarSessionUpdateDto
{
    public int TeamCarId { get; init; }

    public string SessionType { get; init; } = "Practice";
    public DateOnly Date { get; init; }
    public string TrackName { get; init; } = "";

    public int? DriverUserId { get; init; }

    public int Laps { get; init; }
    public string Notes { get; init; } = "";
}