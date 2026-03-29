namespace RacingGarage.Models;

public class TeamCar
{
    public int Id { get; set; }

    public string CarNumber { get; set; } = "";
    public string Nickname { get; set; } = "";

    public string Make { get; set; } = "";
    public string Model { get; set; } = "";
    public int Year { get; set; }

    public string CarClass { get; set; } = "";
    public string Status { get; set; } = "Active";

    public int OdometerKm { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public ICollection<CarSession> Sessions { get; set; } = new List<CarSession>();
}