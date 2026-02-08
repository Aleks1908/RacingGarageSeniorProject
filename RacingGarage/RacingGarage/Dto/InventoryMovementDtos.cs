namespace RacingGarage.dto;

public sealed class InventoryMovementReadDto
{
    public int Id { get; init; }

    public int PartId { get; init; }
    public string PartSku { get; init; } = "";
    public string PartName { get; init; } = "";

    public int InventoryLocationId { get; init; }
    public string LocationCode { get; init; } = "";

    public int QuantityChange { get; init; }
    public string Reason { get; init; } = "";

    public int? WorkOrderId { get; init; }
    public int? PerformedByUserId { get; init; }
    public string? PerformedByName { get; init; }

    public DateTime PerformedAt { get; init; }
    public string Notes { get; init; } = "";
}