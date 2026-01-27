namespace RacingGarage.dto;

public sealed class SupplierReadDto
{
    public int Id { get; init; }
    public string Name { get; init; } = "";
    public string ContactEmail { get; init; } = "";
    public string Phone { get; init; } = "";

    public string AddressLine1 { get; init; } = "";
    public string AddressLine2 { get; init; } = "";
    public string City { get; init; } = "";
    public string Country { get; init; } = "";

    public bool IsActive { get; init; }
    public DateTime CreatedAt { get; init; }
}

public sealed class SupplierCreateDto
{
    public string Name { get; init; } = "";
    public string ContactEmail { get; init; } = "";
    public string Phone { get; init; } = "";

    public string AddressLine1 { get; init; } = "";
    public string AddressLine2 { get; init; } = "";
    public string City { get; init; } = "";
    public string Country { get; init; } = "";
}

public sealed class SupplierUpdateDto
{
    public string Name { get; init; } = "";
    public string ContactEmail { get; init; } = "";
    public string Phone { get; init; } = "";

    public string AddressLine1 { get; init; } = "";
    public string AddressLine2 { get; init; } = "";
    public string City { get; init; } = "";
    public string Country { get; init; } = "";

    public bool IsActive { get; init; } = true;
}