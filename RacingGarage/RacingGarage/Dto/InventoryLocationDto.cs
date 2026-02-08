namespace RacingGarage.dto;

public sealed class InventoryLocationReadDto
{
    public int Id { get; init; }
    public string Name { get; init; } = "";
    public string Code { get; init; } = "";
    public string Description { get; init; } = "";
    public bool IsActive { get; init; }
    public DateTime CreatedAt { get; init; }
}

public sealed class InventoryLocationCreateDto
{
    public string Name { get; init; } = "";
    public string Code { get; init; } = "";
    public string Description { get; init; } = "";
}

public sealed class InventoryLocationUpdateDto
{
    public string Name { get; init; } = "";
    public string Code { get; init; } = "";
    public string Description { get; init; } = "";
    public bool IsActive { get; init; } = true;
}