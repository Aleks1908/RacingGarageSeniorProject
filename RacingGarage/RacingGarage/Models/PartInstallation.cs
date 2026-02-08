namespace RacingGarage.Models;

public class PartInstallation
{
    public int Id { get; set; }

    public int WorkOrderId { get; set; }
    public WorkOrder WorkOrder { get; set; } = null!;

    public int PartId { get; set; }
    public Part Part { get; set; } = null!;

    public int InventoryLocationId { get; set; }
    public InventoryLocation InventoryLocation { get; set; } = null!;

    public int Quantity { get; set; } // must be > 0

    public int? InstalledByUserId { get; set; }
    public AppUser? InstalledByUser { get; set; }

    public DateTime InstalledAt { get; set; } = DateTime.UtcNow;
    public string Notes { get; set; } = "";
}