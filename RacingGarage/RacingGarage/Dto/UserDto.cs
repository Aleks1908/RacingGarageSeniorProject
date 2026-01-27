namespace RacingGarage.dto;

public sealed class UserReadDto
{
    public int Id { get; init; }
    public string Name { get; init; } = "";
    public string Email { get; init; } = "";
    public bool IsActive { get; init; }
    public DateTime CreatedAt { get; init; }

    public List<string> Roles { get; init; } = new();
}

public sealed class UserCreateDto
{
    public string Name { get; init; } = "";
    public string Email { get; init; } = "";
    public string Password { get; init; } = "";
    public string Role { get; init; } = "";
}


public sealed class UserSetRoleDto
{
    public string Role { get; init; } = "";
}