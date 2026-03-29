namespace RacingGarage.Models;

public class Part
{
    public int Id { get; set; }

    public string Name { get; set; } = "";
    public string Sku { get; set; } = "";
    public string Category { get; set; } = "";

    public decimal UnitCost { get; set; }
    public int ReorderPoint { get; set; }
    public int SupplierId { get; set; }
    public Supplier Supplier { get; set; } = null!;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}