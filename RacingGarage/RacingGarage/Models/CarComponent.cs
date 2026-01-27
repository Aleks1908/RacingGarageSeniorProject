namespace RacingGarage.Models;

public class CarComponent
{
    public int Id { get; set; }

    public int TeamCarId { get; set; }
    public TeamCar TeamCar { get; set; } = null!;

    public string ComponentType { get; set; } = ""; // Engine/Brakes/Suspension/etc.
    public string Brand { get; set; } = "";
    public string SerialNumber { get; set; } = "";

    public DateTime InstalledAt { get; set; } = DateTime.UtcNow;
    public DateTime? RemovedAt { get; set; }
    public string Notes { get; set; } = "";
}