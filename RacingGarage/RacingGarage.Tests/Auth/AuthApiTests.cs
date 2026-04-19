using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RacingGarage.Data;
using RacingGarage.Models;
using Xunit;

namespace RacingGarage.Tests.Auth;

public class AuthApiTests : IClassFixture<TestAppFactory>
{
    private readonly TestAppFactory _factory;

    public AuthApiTests(TestAppFactory factory) => _factory = factory;

    private static string U(string prefix) => $"{prefix}-{Guid.NewGuid():N}";

    private async Task ResetDbAsync()
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        await db.Database.ExecuteSqlRawAsync("DELETE FROM UserRoles;");
        await db.Database.ExecuteSqlRawAsync("DELETE FROM Roles;");
        await db.Database.ExecuteSqlRawAsync("DELETE FROM Users;");
    }

    private async Task<(int userId, string email, string password)> SeedUserWithRolesAsync(
        string password,
        params string[] roles)
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var email = $"{U("user")}@test.com".ToLowerInvariant();

        var user = new AppUser
        {
            FirstName = "Test",
            LastName = $"User",
            Email = email,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        var hasher = new PasswordHasher<AppUser>();
        user.PasswordHash = hasher.HashPassword(user, password);

        db.Users.Add(user);

        foreach (var r in roles.Distinct(StringComparer.OrdinalIgnoreCase))
        {
            var role = new Role { Name = r };
            db.Roles.Add(role);
            await db.SaveChangesAsync();

            db.UserRoles.Add(new UserRole
            {
                UserId = user.Id,
                RoleId = role.Id
            });
        }

        await db.SaveChangesAsync();
        return (user.Id, email, password);
    }

    [Fact]
    public async Task Login_returns_400_when_email_missing()
    {
        await ResetDbAsync();

        var client = _factory.CreateClient();
        var res = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email = "   ",
            password = "x"
        });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Login_returns_400_when_password_missing()
    {
        await ResetDbAsync();

        var client = _factory.CreateClient();
        var res = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email = "test@test.com",
            password = "   "
        });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Login_returns_401_when_user_not_found()
    {
        await ResetDbAsync();

        var client = _factory.CreateClient();
        var res = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email = "missing@test.com",
            password = "Whatever123!"
        });

        res.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Login_returns_401_when_password_wrong()
    {
        await ResetDbAsync();

        var seeded = await SeedUserWithRolesAsync(password: "Correct123!", roles: "Driver");

        var client = _factory.CreateClient();
        var res = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email = seeded.email,
            password = "Wrong123!"
        });

        res.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Login_returns_200_and_jwt_contains_expected_claims_and_roles()
    {
        await ResetDbAsync();

        var seeded = await SeedUserWithRolesAsync(
            password: "Correct123!",
            roles: new[] { "Driver", "PartsClerk" });

        var client = _factory.CreateClient();
        var res = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email = $"  {seeded.email.ToUpperInvariant()}  ", 
            password = seeded.password
        });

        res.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await res.Content.ReadFromJsonAsync<LoginResponseLike>();
        body.Should().NotBeNull();

        body!.UserId.Should().Be(seeded.userId);
        body.Email.Should().Be(seeded.email);
        body.FirstName.Should().Be("Test");
        body.LastName.Should().Be("User");
        body.AccessToken.Should().NotBeNullOrWhiteSpace();
        body.ExpiresAtUtc.Should().BeAfter(DateTime.UtcNow.AddHours(5));
        body.Roles.Should().NotBeNull();
        body.Roles.Should().Contain(new[] { "Driver", "PartsClerk" });

        var handler = new JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(body.AccessToken);

        jwt.Claims.Should().Contain(c => c.Type == JwtRegisteredClaimNames.Sub && c.Value == seeded.userId.ToString());
        jwt.Claims.Should().Contain(c => c.Type == JwtRegisteredClaimNames.Email && c.Value == seeded.email);
        jwt.Claims.Should().Contain(c => c.Type == "name" && c.Value == "Test User");
        
        var roleClaims = jwt.Claims
            .Where(c => c.Type == System.Security.Claims.ClaimTypes.Role
                        || c.Type == "role"
                        || c.Type.EndsWith("/role", StringComparison.OrdinalIgnoreCase))
            .Select(c => c.Value)
            .ToList();

        roleClaims.Should().Contain(new[] { "Driver", "PartsClerk" });
    }

    private sealed class LoginResponseLike
    {
        public string AccessToken { get; set; } = "";
        public DateTime ExpiresAtUtc { get; set; }
        public int UserId { get; set; }
        public string FirstName { get; set; } = "";
        public string LastName { get; set; } = "";
        public string Email { get; set; } = "";
        public List<string> Roles { get; set; } = new();
    }
}