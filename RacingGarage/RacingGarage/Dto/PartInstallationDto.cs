namespace RacingGarage.dto;

public sealed class PartInstallationReadDto
{
    public int Id { get; init; }

    public int WorkOrderId { get; init; }

    public int PartId { get; init; }
    public string PartSku { get; init; } = "";
    public string PartName { get; init; } = "";

    public int InventoryLocationId { get; init; }
    public string LocationCode { get; init; } = "";

    public int Quantity { get; init; }

    public int? InstalledByUserId { get; init; }
    public string? InstalledByName { get; init; }

    public DateTime InstalledAt { get; init; }
    public string Notes { get; init; } = "";
}

public sealed class PartInstallationCreateDto
{
    public int WorkOrderId { get; init; }
    public int PartId { get; init; }
    public int InventoryLocationId { get; init; }

    public int Quantity { get; init; } // > 0

    public int? InstalledByUserId { get; init; }
    public string Notes { get; init; } = "";
}