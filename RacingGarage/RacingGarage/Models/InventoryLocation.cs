namespace RacingGarage.Models;

public class InventoryLocation
{
    public int Id { get; set; }

    public string Name { get; set; } = "";
    public string Code { get; set; } = "";
    public string Description { get; set; } = "";

    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}