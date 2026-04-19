using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RacingGarage.Data;
using RacingGarage.dto;
using RacingGarage.Models;
using Xunit;

namespace RacingGarage.Tests.LaborLogs;

public class LaborLogsApiTests : IClassFixture<TestAppFactory>
{
    private readonly TestAppFactory _factory;

    public LaborLogsApiTests(TestAppFactory factory) => _factory = factory;

    private static string U(string prefix) => $"{prefix}-{Guid.NewGuid():N}";

    private async Task<int> EnsureRoleAsync(string roleName)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var existing = await db.Roles.FirstOrDefaultAsync(r => r.Name == roleName);
        if (existing != null) return existing.Id;

        var role = new Role { Name = roleName };
        db.Roles.Add(role);
        await db.SaveChangesAsync();
        return role.Id;
    }

    private async Task<int> SeedUserAsync(string roleName, string? name = null)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var roleId = await EnsureRoleAsync(roleName);

        var user = new AppUser
        {
            FirstName = "User",
            LastName = $"{roleName} {U("N")}",
            Email = $"{Guid.NewGuid():N}@test.local",
            PasswordHash = "hash",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();

        db.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = roleId });
        await db.SaveChangesAsync();

        return user.Id;
    }

    private async Task<int> SeedTeamCarAsync(string? carNumber = null, string status = "Active")
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var car = new TeamCar
        {
            CarNumber = (carNumber ?? U("CAR")).ToUpperInvariant(),
            Status = status
        };

        db.TeamCars.Add(car);
        await db.SaveChangesAsync();
        return car.Id;
    }

    private async Task<int> SeedWorkOrderAsync(int teamCarId, int createdByUserId)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var wo = new WorkOrder
        {
            TeamCarId = teamCarId,
            CreatedByUserId = createdByUserId,
            AssignedToUserId = null,
            CarSessionId = null,
            Title = "WO " + U("T"),
            Description = "",
            Priority = "Medium",
            Status = "Open",
            CreatedAt = DateTime.UtcNow,
            DueDate = null,
            ClosedAt = null,
        };

        db.WorkOrders.Add(wo);
        await db.SaveChangesAsync();
        return wo.Id;
    }

    private async Task<int> SeedWorkOrderTaskAsync(int workOrderId, string? title = null)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var t = new WorkOrderTask
        {
            WorkOrderId = workOrderId,
            Title = title ?? "Task " + U("TT"),
            Description = "",
            Status = "Open",
            SortOrder = 1,
            EstimatedMinutes = 30,
            CompletedAt = null
        };

        db.WorkOrderTasks.Add(t);
        await db.SaveChangesAsync();
        return t.Id;
    }

    private async Task<int> SeedLaborLogAsync(int taskId, int mechanicUserId, int minutes = 15, DateOnly? logDate = null, string comment = "Seed")
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var l = new LaborLog
        {
            WorkOrderTaskId = taskId,
            MechanicUserId = mechanicUserId,
            Minutes = minutes,
            LogDate = logDate ?? DateOnly.FromDateTime(DateTime.UtcNow),
            Comment = comment
        };

        db.LaborLogs.Add(l);
        await db.SaveChangesAsync();
        return l.Id;
    }

    private async Task<int> SeedTaskGraphAsync()
    {
        var driverId = await SeedUserAsync("Driver");
        var carId = await SeedTeamCarAsync();
        var woId = await SeedWorkOrderAsync(carId, driverId);
        return await SeedWorkOrderTaskAsync(woId);
    }

    [Fact]
    public async Task GetAll_returns_200_for_authenticated_user()
    {
        var userId = await SeedUserAsync("Driver");
        var client = _factory.CreateClient().AsUser(userId: userId, roles: "Driver");

        var res = await client.GetAsync("/api/labor-logs");

        res.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetAll_can_filter_by_workOrderTaskId()
    {
        var mechanicId = await SeedUserAsync("Mechanic");
        var taskId1 = await SeedTaskGraphAsync();
        var taskId2 = await SeedTaskGraphAsync();

        var log1 = await SeedLaborLogAsync(taskId1, mechanicId, minutes: 10, comment: "A");
        await SeedLaborLogAsync(taskId2, mechanicId, minutes: 20, comment: "B");

        var client = _factory.CreateClient().AsUser(userId: mechanicId, roles: "Mechanic");

        var res = await client.GetAsync($"/api/labor-logs?workOrderTaskId={taskId1}");
        res.StatusCode.Should().Be(HttpStatusCode.OK);

        var list = await res.Content.ReadFromJsonAsync<List<LaborLogReadDto>>();
        list.Should().NotBeNull();
        list!.Select(x => x.Id).Should().Contain(log1);
        list.All(x => x.WorkOrderTaskId == taskId1).Should().BeTrue();
    }

    [Fact]
    public async Task GetById_returns_404_when_missing()
    {
        var userId = await SeedUserAsync("Driver");
        var client = _factory.CreateClient().AsUser(userId: userId, roles: "Driver");

        var res = await client.GetAsync("/api/labor-logs/999999");

        res.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetById_returns_200_when_exists()
    {
        var mechanicId = await SeedUserAsync("Mechanic");
        var taskId = await SeedTaskGraphAsync();
        var logId = await SeedLaborLogAsync(taskId, mechanicId, minutes: 33, comment: "Hello");

        var client = _factory.CreateClient().AsUser(userId: mechanicId, roles: "Mechanic");

        var res = await client.GetAsync($"/api/labor-logs/{logId}");
        res.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await res.Content.ReadFromJsonAsync<LaborLogReadDto>();
        body.Should().NotBeNull();
        body!.Id.Should().Be(logId);
        body.Minutes.Should().Be(33);
        body.Comment.Should().Be("Hello");
        body.MechanicUserId.Should().Be(mechanicId);
        body.WorkOrderTaskId.Should().Be(taskId);
        body.MechanicName.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task Create_requires_auth()
    {
        var res = await _factory.CreateClient().AsAnonymous()
            .PostAsJsonAsync("/api/labor-logs", new { });

        res.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Create_requires_role()
    {
        var driverId = await SeedUserAsync("Driver");
        var taskId = await SeedTaskGraphAsync();
        var client = _factory.CreateClient().AsUser(userId: driverId, roles: "Driver");

        var res = await client.PostAsJsonAsync("/api/labor-logs", new
        {
            workOrderTaskId = taskId,
            minutes = 10,
            logDate = DateOnly.FromDateTime(DateTime.UtcNow),
            comment = "Nope"
        });

        res.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Create_valid_returns_201_and_sets_mechanic_to_current_user()
    {
        var mechanicId = await SeedUserAsync("Mechanic");
        var taskId = await SeedTaskGraphAsync();
        var client = _factory.CreateClient().AsUser(userId: mechanicId, roles: "Mechanic");

        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var res = await client.PostAsJsonAsync("/api/labor-logs", new
        {
            workOrderTaskId = taskId,
            minutes = 25,
            logDate = today,
            comment = "  did work  "
        });

        res.StatusCode.Should().Be(HttpStatusCode.Created);

        var body = await res.Content.ReadFromJsonAsync<LaborLogReadDto>();
        body.Should().NotBeNull();
        body!.WorkOrderTaskId.Should().Be(taskId);
        body.MechanicUserId.Should().Be(mechanicId);
        body.Minutes.Should().Be(25);
        body.LogDate.Should().Be(today);
        body.Comment.Should().Be("did work");
    }

    [Fact]
    public async Task Create_rejects_missing_task()
    {
        var mechanicId = await SeedUserAsync("Mechanic");
        var client = _factory.CreateClient().AsUser(userId: mechanicId, roles: "Mechanic");

        var res = await client.PostAsJsonAsync("/api/labor-logs", new
        {
            workOrderTaskId = 999999,
            minutes = 10,
            logDate = DateOnly.FromDateTime(DateTime.UtcNow)
        });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Create_rejects_minutes_le_0()
    {
        var mechanicId = await SeedUserAsync("Mechanic");
        var taskId = await SeedTaskGraphAsync();
        var client = _factory.CreateClient().AsUser(userId: mechanicId, roles: "Mechanic");

        var res = await client.PostAsJsonAsync("/api/labor-logs", new
        {
            workOrderTaskId = taskId,
            minutes = 0,
            logDate = DateOnly.FromDateTime(DateTime.UtcNow)
        });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Update_returns_404_when_missing()
    {
        var mechanicId = await SeedUserAsync("Mechanic");
        var client = _factory.CreateClient().AsUser(userId: mechanicId, roles: "Mechanic");

        var res = await client.PutAsJsonAsync("/api/labor-logs/999999", new
        {
            minutes = 10,
            logDate = DateOnly.FromDateTime(DateTime.UtcNow),
            comment = "x"
        });

        res.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Update_rejects_minutes_le_0()
    {
        var mechanicId = await SeedUserAsync("Mechanic");
        var taskId = await SeedTaskGraphAsync();
        var logId = await SeedLaborLogAsync(taskId, mechanicId);

        var client = _factory.CreateClient().AsUser(userId: mechanicId, roles: "Mechanic");

        var res = await client.PutAsJsonAsync($"/api/labor-logs/{logId}", new
        {
            minutes = 0,
            logDate = DateOnly.FromDateTime(DateTime.UtcNow),
            comment = "x"
        });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Update_non_manager_cannot_edit_other_users_log()
    {
        var mechanicA = await SeedUserAsync("Mechanic");
        var mechanicB = await SeedUserAsync("Mechanic");
        var taskId = await SeedTaskGraphAsync();
        var logId = await SeedLaborLogAsync(taskId, mechanicA, minutes: 10, comment: "A");

        var client = _factory.CreateClient().AsUser(userId: mechanicB, roles: "Mechanic");

        var res = await client.PutAsJsonAsync($"/api/labor-logs/{logId}", new
        {
            minutes = 99,
            logDate = DateOnly.FromDateTime(DateTime.UtcNow),
            comment = "Hacked"
        });

        res.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Update_mechanic_can_edit_own_log()
    {
        var mechanic = await SeedUserAsync("Mechanic");
        var taskId = await SeedTaskGraphAsync();
        var logId = await SeedLaborLogAsync(taskId, mechanic, minutes: 10, comment: "Old");

        var client = _factory.CreateClient().AsUser(userId: mechanic, roles: "Mechanic");

        var newDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-1));

        var res = await client.PutAsJsonAsync($"/api/labor-logs/{logId}", new
        {
            minutes = 45,
            logDate = newDate,
            comment = "  updated  "
        });

        res.StatusCode.Should().Be(HttpStatusCode.NoContent);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var updated = await db.LaborLogs.AsNoTracking().FirstAsync(l => l.Id == logId);
        updated.Minutes.Should().Be(45);
        updated.LogDate.Should().Be(newDate);
        updated.Comment.Should().Be("updated");
    }

    [Fact]
    public async Task Update_manager_can_edit_any_log()
    {
        var managerId = await SeedUserAsync("Manager");
        var mechanicId = await SeedUserAsync("Mechanic");
        var taskId = await SeedTaskGraphAsync();
        var logId = await SeedLaborLogAsync(taskId, mechanicId, minutes: 10, comment: "Old");

        var client = _factory.CreateClient().AsUser(userId: managerId, roles: "Manager");

        var res = await client.PutAsJsonAsync($"/api/labor-logs/{logId}", new
        {
            minutes = 60,
            logDate = DateOnly.FromDateTime(DateTime.UtcNow),
            comment = "Manager edit"
        });

        res.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task Delete_returns_404_when_missing()
    {
        var mechanicId = await SeedUserAsync("Mechanic");
        var client = _factory.CreateClient().AsUser(userId: mechanicId, roles: "Mechanic");

        var res = await client.DeleteAsync("/api/labor-logs/999999");

        res.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Delete_requires_role()
    {
        var driverId = await SeedUserAsync("Driver");
        var taskId = await SeedTaskGraphAsync();
        var logId = await SeedLaborLogAsync(taskId, mechanicUserId: await SeedUserAsync("Mechanic"));

        var client = _factory.CreateClient().AsUser(userId: driverId, roles: "Driver");

        var res = await client.DeleteAsync($"/api/labor-logs/{logId}");

        res.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Delete_valid_removes_row()
    {
        var mechanicId = await SeedUserAsync("Mechanic");
        var taskId = await SeedTaskGraphAsync();
        var logId = await SeedLaborLogAsync(taskId, mechanicId);

        var client = _factory.CreateClient().AsUser(userId: mechanicId, roles: "Mechanic");

        var res = await client.DeleteAsync($"/api/labor-logs/{logId}");

        res.StatusCode.Should().Be(HttpStatusCode.NoContent);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var exists = await db.LaborLogs.AnyAsync(l => l.Id == logId);
        exists.Should().BeFalse();
    }
}