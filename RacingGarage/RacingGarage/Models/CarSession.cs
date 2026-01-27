namespace RacingGarage.Models;

public class CarSession
{
    public int Id { get; set; }

    public int TeamCarId { get; set; }
    public TeamCar TeamCar { get; set; } = null!;

    public string SessionType { get; set; } = "Practice"; // Practice/Test/Race
    public DateOnly Date { get; set; }
    public string TrackName { get; set; } = "";

    public int? DriverUserId { get; set; }   // links to Users (optional)
    public AppUser? DriverUser { get; set; }

    public int Laps { get; set; }
    public string Notes { get; set; } = "";
}