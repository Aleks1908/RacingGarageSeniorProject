namespace RacingGarage.dto;

public sealed class PartReadDto
{
    public int Id { get; init; }

    public string Name { get; init; } = "";
    public string Sku { get; init; } = "";
    public string Category { get; init; } = "";

    public decimal UnitCost { get; init; }
    public int ReorderPoint { get; init; }

    public int? SupplierId { get; init; }
    public string? SupplierName { get; init; }

    public bool IsActive { get; init; }
    public DateTime CreatedAt { get; init; }
    
    public int? CurrentStock { get; init; }   
    
    public bool? NeedsReorder { get; init; }
}

public sealed class PartCreateDto
{
    public string Name { get; init; } = "";
    public string Sku { get; init; } = "";
    public string Category { get; init; } = "";

    public decimal UnitCost { get; init; }
    public int ReorderPoint { get; init; }

    public int? SupplierId { get; init; }
}

public sealed class PartUpdateDto
{
    public string Name { get; init; } = "";
    public string Sku { get; init; } = "";
    public string Category { get; init; } = "";

    public decimal UnitCost { get; init; }
    public int ReorderPoint { get; init; }

    public int? SupplierId { get; init; }
    public bool IsActive { get; init; } = true;
}