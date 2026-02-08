namespace RacingGarage.dto;

public sealed class LoginRequestDto
{
    public string Email { get; init; } = "";
    public string Password { get; init; } = "";
}

public sealed class LoginResponseDto
{
    public string AccessToken { get; init; } = "";
    public DateTime ExpiresAtUtc { get; init; }

    public int UserId { get; init; }
    public string Name { get; init; } = "";
    public string Email { get; init; } = "";
    public List<string> Roles { get; init; } = new();
}