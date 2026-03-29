namespace RacingGarage.dto;

public sealed class UserUpdateDto
{
    public string Name { get; init; } = "";
    public string Email { get; init; } = "";
    
    public string OldPassword { get; init; } = "";
}

public sealed class UserChangePasswordDto
{
    public string OldPassword { get; init; } = "";
    public string NewPassword { get; init; } = "";
}