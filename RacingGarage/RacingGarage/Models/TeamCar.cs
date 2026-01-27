namespace RacingGarage.Models;

public class TeamCar
{
    public int Id { get; set; }

    public string CarNumber { get; set; } = "";     // e.g. "27"
    public string Nickname { get; set; } = "";      // e.g. "Blue Rocket"

    public string Make { get; set; } = "";
    public string Model { get; set; } = "";
    public int Year { get; set; }

    public string CarClass { get; set; } = "";      // e.g. "GT4", "Time Attack"
    public string Status { get; set; } = "Active";  // Active / InService / Retired

    public int OdometerKm { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<CarComponent> Components { get; set; } = new List<CarComponent>();
    public ICollection<CarSession> Sessions { get; set; } = new List<CarSession>();
}