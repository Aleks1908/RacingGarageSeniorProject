namespace RacingGarage.dto;

public sealed class InventoryStockReadDto
{
    public int Id { get; init; }

    public int PartId { get; init; }
    public string PartName { get; init; } = "";
    public string PartSku { get; init; } = "";

    public int InventoryLocationId { get; init; }
    public string LocationCode { get; init; } = "";

    public int Quantity { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public sealed class InventoryStockAdjustDto
{
    public int PartId { get; init; }
    public int InventoryLocationId { get; init; }

    public int QuantityChange { get; init; }
    public string Reason { get; init; } = "Adjustment";

    public int? WorkOrderId { get; init; }
    public int? PerformedByUserId { get; init; }
    public string Notes { get; init; } = "";
}