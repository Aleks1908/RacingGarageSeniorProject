namespace RacingGarage.Models;

public class InventoryStock
{
    public int Id { get; set; }

    public int PartId { get; set; }
    public Part Part { get; set; } = null!;

    public int InventoryLocationId { get; set; }
    public InventoryLocation InventoryLocation { get; set; } = null!;

    public int Quantity { get; set; } // cannot go below 0

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}