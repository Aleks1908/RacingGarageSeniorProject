namespace RacingGarage.dto;

public sealed class UserUpdateDto
{
    public string FirstName { get; set; } = null!;
    public string LastName { get; set; } = null!;
    public string Email { get; init; } = "";
    
    public string OldPassword { get; init; } = "";
}

public sealed class UserChangePasswordDto
{
    public string OldPassword { get; init; } = "";
    public string NewPassword { get; init; } = "";
}