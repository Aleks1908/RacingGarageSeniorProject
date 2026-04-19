using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RacingGarage.Data;
using RacingGarage.dto;
using RacingGarage.Models;
using Xunit;

namespace RacingGarage.Tests.Users;

public class UsersApiTests : IClassFixture<TestAppFactory>
{
    private readonly TestAppFactory _factory;

    public UsersApiTests(TestAppFactory factory) => _factory = factory;

    private async Task<int> EnsureRoleAsync(string roleName)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var existing = await db.Roles.FirstOrDefaultAsync(r => r.Name == roleName);
        if (existing != null) return existing.Id;

        var r = new Role { Name = roleName };
        db.Roles.Add(r);
        await db.SaveChangesAsync();
        return r.Id;
    }

    private async Task<(int userId, string email, string password)> SeedUserWithRoleAsync(
        string roleName,
        string? name = null,
        string? password = null,
        bool isActive = true)
    {
        var pwd = password ?? "Pass123!";
        var nm = name ?? $"User {roleName}";
        var email = $"{Guid.NewGuid():N}@test.local";

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var roleId = await EnsureRoleAsync(roleName);

        var u = new AppUser
        {
            FirstName = (nm?.Split(' ', 2, StringSplitOptions.RemoveEmptyEntries).FirstOrDefault()) ?? "Test",
            LastName  = (nm?.Split(' ', 2, StringSplitOptions.RemoveEmptyEntries).Skip(1).FirstOrDefault()) ?? "User",
            Email = email,
            IsActive = isActive,
            CreatedAt = DateTime.UtcNow
        };

        var hasher = new Microsoft.AspNetCore.Identity.PasswordHasher<AppUser>();
        u.PasswordHash = hasher.HashPassword(u, pwd);

        db.Users.Add(u);
        await db.SaveChangesAsync();

        db.UserRoles.Add(new UserRole { UserId = u.Id, RoleId = roleId });
        await db.SaveChangesAsync();

        return (u.Id, email, pwd);
    }

    private async Task<int> SeedRoleOnlyUserAsync(string roleName)
    {
        var (id, _, _) = await SeedUserWithRoleAsync(roleName);
        return id;
    }

    [Fact]
    public async Task GetAll_returns_200_for_authenticated_user()
    {
        await SeedRoleOnlyUserAsync("Driver");

        var client = _factory.CreateClient().AsUser(userId: 1, roles: "Driver");
        var res = await client.GetAsync("/api/users");

        res.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetById_returns_404_when_missing()
    {
        var client = _factory.CreateClient().AsUser(userId: 1, roles: "Driver");
        var res = await client.GetAsync("/api/users/999999");

        res.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Create_requires_auth()
    {
        var res = await _factory.CreateClient().AsAnonymous()
            .PostAsJsonAsync("/api/users", new { });

        res.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Create_requires_manager_role()
    {
        var client = _factory.CreateClient().AsUser(userId: 1, roles: "Driver");

        var res = await client.PostAsJsonAsync("/api/users", new
        {
            firstName = "New",
            lastName = "User",
            email = "new@test.local",
            password = "Pass123!",
            role = "Driver"
        });

        res.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Create_returns_400_when_role_does_not_exist()
    {
        var managerId = await SeedRoleOnlyUserAsync("Manager");
        var client = _factory.CreateClient().AsUser(userId: managerId, roles: "Manager");

        var res = await client.PostAsJsonAsync("/api/users", new
        {
            firstName = "New",
            lastName = "User",
            email = $"{Guid.NewGuid():N}@test.local",
            password = "Pass123!",
            role = "NotARealRole"
        });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Create_returns_409_when_email_taken()
    {
        var managerId = await SeedRoleOnlyUserAsync("Manager");
        var (existingUserId, existingEmail, _) = await SeedUserWithRoleAsync("Driver");

        var client = _factory.CreateClient().AsUser(userId: managerId, roles: "Manager");

        var res = await client.PostAsJsonAsync("/api/users", new
        {
            firstName = "Another",
            lastName = "User",
            email = existingEmail,
            password = "Pass123!",
            role = "Driver"
        });

        res.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Create_returns_201_and_assigns_role()
    {
        await EnsureRoleAsync("Driver");

        var managerId = await SeedRoleOnlyUserAsync("Manager");
        var client = _factory.CreateClient().AsUser(userId: managerId, roles: "Manager");

        var email = $"{Guid.NewGuid():N}@test.local";

        var res = await client.PostAsJsonAsync("/api/users", new
        {
            firstName = "Created",
            lastName = "User",
            email,
            password = "Pass123!",
            role = "Driver"
        });

        res.StatusCode.Should().Be(HttpStatusCode.Created);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var created = await db.Users
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Email == email);

        created.Should().NotBeNull();
        created!.UserRoles.Select(ur => ur.Role.Name).Should().Contain("Driver");
    }

    [Fact]
    public async Task SetRole_requires_manager()
    {
        var targetId = await SeedRoleOnlyUserAsync("Driver");
        await EnsureRoleAsync("PartsClerk");

        var client = _factory.CreateClient().AsUser(userId: 1, roles: "Driver");

        var res = await client.PutAsJsonAsync($"/api/users/{targetId}/role", new { role = "PartsClerk" });

        res.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task SetRole_returns_204_and_replaces_existing_role()
    {
        var managerId = await SeedRoleOnlyUserAsync("Manager");
        var target = await SeedUserWithRoleAsync("Driver");
        await EnsureRoleAsync("PartsClerk");

        var client = _factory.CreateClient().AsUser(userId: managerId, roles: "Manager");

        var res = await client.PutAsJsonAsync($"/api/users/{target.userId}/role", new { role = "PartsClerk" });

        res.StatusCode.Should().Be(HttpStatusCode.NoContent);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var u = await db.Users
            .Include(x => x.UserRoles).ThenInclude(ur => ur.Role)
            .FirstAsync(x => x.Id == target.userId);

        u.UserRoles.Select(ur => ur.Role.Name).Should().BeEquivalentTo(new[] { "PartsClerk" });
    }

    [Fact]
    public async Task Deactivate_requires_manager()
    {
        var target = await SeedUserWithRoleAsync("Driver");

        var client = _factory.CreateClient().AsUser(userId: 1, roles: "Driver");

        var res = await client.PutAsync($"/api/users/{target.userId}/deactivate", content: null);

        res.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Deactivate_returns_204_and_sets_isActive_false()
    {
        var managerId = await SeedRoleOnlyUserAsync("Manager");
        var target = await SeedUserWithRoleAsync("Driver");

        var client = _factory.CreateClient().AsUser(userId: managerId, roles: "Manager");

        var res = await client.PutAsync($"/api/users/{target.userId}/deactivate", content: null);

        res.StatusCode.Should().Be(HttpStatusCode.NoContent);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var u = await db.Users.FirstAsync(x => x.Id == target.userId);
        u.IsActive.Should().BeFalse();
    }

    [Fact]
    public async Task GetMe_requires_auth()
    {
        var res = await _factory.CreateClient().AsAnonymous()
            .GetAsync("/api/users/me");

        res.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetMe_returns_200_and_current_user()
    {
        var user = await SeedUserWithRoleAsync("Driver");

        var client = _factory.CreateClient().AsUser(userId: user.userId, roles: "Driver");

        var res = await client.GetAsync("/api/users/me");

        res.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await res.Content.ReadFromJsonAsync<UserReadDto>();
        body.Should().NotBeNull();
        body!.Id.Should().Be(user.userId);
        body.Email.Should().Be(user.email);
        body.Roles.Should().Contain("Driver");
    }

    [Fact]
    public async Task UpdateMe_requires_auth()
    {
        var res = await _factory.CreateClient().AsAnonymous()
            .PutAsJsonAsync("/api/users/me", new { });

        res.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task UpdateMe_returns_400_when_oldPassword_missing()
    {
        var user = await SeedUserWithRoleAsync("Driver");

        var client = _factory.CreateClient().AsUser(userId: user.userId, roles: "Driver");

        var res = await client.PutAsJsonAsync("/api/users/me", new
        {
            firstName = "New",
            lastName = "Name",
            email = $"{Guid.NewGuid():N}@test.local"
        });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task UpdateMe_returns_400_when_oldPassword_incorrect()
    {
        var user = await SeedUserWithRoleAsync("Driver");

        var client = _factory.CreateClient().AsUser(userId: user.userId, roles: "Driver");

        var res = await client.PutAsJsonAsync("/api/users/me", new
        {
            oldPassword = "WRONG",
            firstName = "New",
            lastName = "Name",
            email = $"{Guid.NewGuid():N}@test.local"
        });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task UpdateMe_returns_409_when_email_taken()
    {
        var user = await SeedUserWithRoleAsync("Driver");
        var other = await SeedUserWithRoleAsync("Driver");

        var client = _factory.CreateClient().AsUser(userId: user.userId, roles: "Driver");

        var res = await client.PutAsJsonAsync("/api/users/me", new
        {
            oldPassword = user.password,
            firstName = "New",
            lastName = "Name",
            email = other.email
        });

        res.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task UpdateMe_returns_200_updates_user_and_returns_token()
    {
        var user = await SeedUserWithRoleAsync("Driver");
        var newEmail = $"{Guid.NewGuid():N}@test.local";

        var client = _factory.CreateClient().AsUser(userId: user.userId, roles: "Driver");

        var res = await client.PutAsJsonAsync("/api/users/me", new
        {
            oldPassword = user.password,
            firstName = "Updated",
            lastName = "Name",
            email = newEmail
        });

        res.StatusCode.Should().Be(HttpStatusCode.OK);

        var json = await res.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        json.Should().NotBeNull();
        json!.ContainsKey("token").Should().BeTrue();
        json.ContainsKey("user").Should().BeTrue();

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var u = await db.Users.FirstAsync(x => x.Id == user.userId);
        u.FirstName.Should().Be("Updated");
        u.LastName.Should().Be("Name");
        u.Email.Should().Be(newEmail);
    }

    [Fact]
    public async Task ChangeMyPassword_requires_auth()
    {
        var res = await _factory.CreateClient().AsAnonymous()
            .PutAsJsonAsync("/api/users/me/password", new { });

        res.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task ChangeMyPassword_returns_400_when_newPassword_too_short()
    {
        var user = await SeedUserWithRoleAsync("Driver");
        var client = _factory.CreateClient().AsUser(userId: user.userId, roles: "Driver");

        var res = await client.PutAsJsonAsync("/api/users/me/password", new
        {
            oldPassword = user.password,
            newPassword = "123"
        });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task ChangeMyPassword_returns_400_when_oldPassword_wrong()
    {
        var user = await SeedUserWithRoleAsync("Driver");
        var client = _factory.CreateClient().AsUser(userId: user.userId, roles: "Driver");

        var res = await client.PutAsJsonAsync("/api/users/me/password", new
        {
            oldPassword = "WRONG",
            newPassword = "NewPass123!"
        });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task ChangeMyPassword_returns_200_and_password_is_changed()
    {
        var user = await SeedUserWithRoleAsync("Driver");
        var client = _factory.CreateClient().AsUser(userId: user.userId, roles: "Driver");

        var res = await client.PutAsJsonAsync("/api/users/me/password", new
        {
            oldPassword = user.password,
            newPassword = "NewPass123!"
        });

        res.StatusCode.Should().Be(HttpStatusCode.OK);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var u = await db.Users.FirstAsync(x => x.Id == user.userId);

        var hasher = new Microsoft.AspNetCore.Identity.PasswordHasher<AppUser>();

        hasher.VerifyHashedPassword(u, u.PasswordHash ?? "", user.password)
            .Should().Be(Microsoft.AspNetCore.Identity.PasswordVerificationResult.Failed);

        hasher.VerifyHashedPassword(u, u.PasswordHash ?? "", "NewPass123!")
            .Should().NotBe(Microsoft.AspNetCore.Identity.PasswordVerificationResult.Failed);
    }
}