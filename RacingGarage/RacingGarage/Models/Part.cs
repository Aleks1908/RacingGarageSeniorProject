namespace RacingGarage.Models;

public class Part
{
    public int Id { get; set; }

    public string Name { get; set; } = "";       // "Brake Pad Set"
    public string Sku { get; set; } = "";        // unique
    public string Category { get; set; } = "";   // "Brakes", "Engine", etc.

    public decimal UnitCost { get; set; }        // stored in DB as decimal
    public int ReorderPoint { get; set; }        // threshold for "needs reorder"

    public int? SupplierId { get; set; }
    public Supplier? Supplier { get; set; }

    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}