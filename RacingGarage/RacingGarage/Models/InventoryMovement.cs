namespace RacingGarage.Models;

public class InventoryMovement
{
    public int Id { get; set; }

    public int PartId { get; set; }
    public Part Part { get; set; } = null!;

    public int InventoryLocationId { get; set; }
    public InventoryLocation InventoryLocation { get; set; } = null!;

    public int QuantityChange { get; set; } // +in, -out
    public string Reason { get; set; } = ""; // "Adjustment", "Receive", "Install", etc.

    public int? WorkOrderId { get; set; }
    public WorkOrder? WorkOrder { get; set; }

    public int? PerformedByUserId { get; set; }
    public AppUser? PerformedByUser { get; set; }

    public DateTime PerformedAt { get; set; } = DateTime.UtcNow;
    public string Notes { get; set; } = "";
}