using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RacingGarage.Data;
using RacingGarage.dto;
using RacingGarage.Models;
using Xunit;

namespace RacingGarage.Tests.WorkOrderTasks;

public class WorkOrderTasksApiTests : IClassFixture<TestAppFactory>
{
    private readonly TestAppFactory _factory;

    public WorkOrderTasksApiTests(TestAppFactory factory) => _factory = factory;

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
            Name = name ?? $"{roleName} {U("U")}",
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

    private async Task<int> SeedCarAsync(string? carNumber = null)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var car = new TeamCar
        {
            CarNumber = (carNumber ?? U("CAR")).ToUpperInvariant(),
            Nickname = "Nick",
            Make = "Make",
            Model = "Model",
            Year = 2020,
            CarClass = "GT",
            Status = "Active",
            OdometerKm = 0,
            CreatedAt = DateTime.UtcNow
        };

        db.TeamCars.Add(car);
        await db.SaveChangesAsync();
        return car.Id;
    }

    private async Task<int> SeedWorkOrderAsync(int teamCarId, int createdByUserId, string status = "Open")
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var wo = new WorkOrder
        {
            TeamCarId = teamCarId,
            CreatedByUserId = createdByUserId,
            AssignedToUserId = null,
            CarSessionId = null,
            Title = "WO " + U("W"),
            Description = "",
            Priority = "Medium",
            Status = status,
            CreatedAt = DateTime.UtcNow,
            DueDate = null,
            ClosedAt = null,
            LinkedIssueId = null
        };

        db.WorkOrders.Add(wo);
        await db.SaveChangesAsync();
        return wo.Id;
    }

    private async Task<int> SeedTaskAsync(int workOrderId, int sortOrder, string title, string status = "Todo")
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var task = new WorkOrderTask
        {
            WorkOrderId = workOrderId,
            Title = title,
            Description = "",
            Status = status,
            SortOrder = sortOrder,
            EstimatedMinutes = null,
            CompletedAt = null
        };

        db.WorkOrderTasks.Add(task);
        await db.SaveChangesAsync();
        return task.Id;
    }

    [Fact]
    public async Task GetAll_returns_200_for_authenticated_user()
    {
        var driverId = await SeedUserAsync("Driver");
        var client = _factory.CreateClient().AsUser(userId: driverId, roles: "Driver");

        var res = await client.GetAsync("/api/work-order-tasks");

        res.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetAll_filters_by_workOrderId_and_orders_by_workOrder_sortOrder_id()
    {
        var driverId = await SeedUserAsync("Driver");
        var carId = await SeedCarAsync();
        var woId = await SeedWorkOrderAsync(carId, driverId);
        var otherWoId = await SeedWorkOrderAsync(carId, driverId);

        var t2 = await SeedTaskAsync(woId, sortOrder: 2, title: "B");
        var t1 = await SeedTaskAsync(woId, sortOrder: 1, title: "A");
        _ = await SeedTaskAsync(otherWoId, sortOrder: 0, title: "OTHER");

        var client = _factory.CreateClient().AsUser(userId: driverId, roles: "Driver");

        var res = await client.GetAsync($"/api/work-order-tasks?workOrderId={woId}");
        res.StatusCode.Should().Be(HttpStatusCode.OK);

        var list = await res.Content.ReadFromJsonAsync<List<WorkOrderTaskReadDto>>();
        list.Should().NotBeNull();
        list!.Count.Should().Be(2);
        list.All(x => x.WorkOrderId == woId).Should().BeTrue();

        list[0].SortOrder.Should().Be(1);
        list[1].SortOrder.Should().Be(2);
        list.Select(x => x.Id).Should().Contain(new[] { t1, t2 });
        list[0].Title.Should().Be("A");
        list[1].Title.Should().Be("B");
    }

    [Fact]
    public async Task GetById_returns_404_when_missing()
    {
        var driverId = await SeedUserAsync("Driver");
        var client = _factory.CreateClient().AsUser(userId: driverId, roles: "Driver");

        var res = await client.GetAsync("/api/work-order-tasks/999999");

        res.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetById_returns_200_when_exists()
    {
        var driverId = await SeedUserAsync("Driver");
        var carId = await SeedCarAsync();
        var woId = await SeedWorkOrderAsync(carId, driverId);
        var taskId = await SeedTaskAsync(woId, 0, "My Task", status: "Todo");

        var client = _factory.CreateClient().AsUser(userId: driverId, roles: "Driver");

        var res = await client.GetAsync($"/api/work-order-tasks/{taskId}");
        res.StatusCode.Should().Be(HttpStatusCode.OK);

        var dto = await res.Content.ReadFromJsonAsync<WorkOrderTaskReadDto>();
        dto.Should().NotBeNull();
        dto!.Id.Should().Be(taskId);
        dto.WorkOrderId.Should().Be(woId);
        dto.Title.Should().Be("My Task");
        dto.Status.Should().Be("Todo");
    }

    [Fact]
    public async Task Create_requires_auth()
    {
        var res = await _factory.CreateClient().AsAnonymous()
            .PostAsJsonAsync("/api/work-order-tasks", new { });

        res.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Create_requires_role()
    {
        var driverId = await SeedUserAsync("Driver");
        var client = _factory.CreateClient().AsUser(userId: driverId, roles: "Driver");

        var res = await client.PostAsJsonAsync("/api/work-order-tasks", new
        {
            workOrderId = 1,
            title = "Nope",
            sortOrder = 0
        });

        res.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Create_validates_required_fields_and_ranges()
    {
        var mechId = await SeedUserAsync("Mechanic");
        var client = _factory.CreateClient().AsUser(userId: mechId, roles: "Mechanic");

        (await client.PostAsJsonAsync("/api/work-order-tasks", new { workOrderId = 0, title = "T", sortOrder = 0 }))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);

        (await client.PostAsJsonAsync("/api/work-order-tasks", new { workOrderId = 1, title = "   ", sortOrder = 0 }))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);

        (await client.PostAsJsonAsync("/api/work-order-tasks", new { workOrderId = 1, title = "T", sortOrder = -1 }))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);

        (await client.PostAsJsonAsync("/api/work-order-tasks", new { workOrderId = 1, title = "T", sortOrder = 0, estimatedMinutes = -5 }))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Create_requires_existing_workOrder()
    {
        var mechId = await SeedUserAsync("Mechanic");
        var client = _factory.CreateClient().AsUser(userId: mechId, roles: "Mechanic");

        var res = await client.PostAsJsonAsync("/api/work-order-tasks", new
        {
            workOrderId = 999999,
            title = "Task",
            sortOrder = 0
        });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Create_valid_returns_201_and_defaults_status_to_Todo()
    {
        var mechId = await SeedUserAsync("Mechanic");
        var carId = await SeedCarAsync();
        var creatorId = await SeedUserAsync("Driver");
        var woId = await SeedWorkOrderAsync(carId, creatorId);

        var client = _factory.CreateClient().AsUser(userId: mechId, roles: "Mechanic");

        var res = await client.PostAsJsonAsync("/api/work-order-tasks", new
        {
            workOrderId = woId,
            title = "  New Task  ",
            description = "  Desc  ",
            status = "   ",
            sortOrder = 3,
            estimatedMinutes = 15
        });

        res.StatusCode.Should().Be(HttpStatusCode.Created);

        var dto = await res.Content.ReadFromJsonAsync<WorkOrderTaskReadDto>();
        dto.Should().NotBeNull();
        dto!.WorkOrderId.Should().Be(woId);
        dto.Title.Should().Be("New Task");
        dto.Description.Should().Be("Desc");
        dto.Status.Should().Be("Todo");
        dto.SortOrder.Should().Be(3);
        dto.EstimatedMinutes.Should().Be(15);
        dto.CompletedAt.Should().BeNull();
    }

    [Fact]
    public async Task Update_requires_auth()
    {
        var res = await _factory.CreateClient().AsAnonymous()
            .PutAsJsonAsync("/api/work-order-tasks/1", new { });

        res.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Update_requires_role()
    {
        var driverId = await SeedUserAsync("Driver");
        var client = _factory.CreateClient().AsUser(userId: driverId, roles: "Driver");

        var res = await client.PutAsJsonAsync("/api/work-order-tasks/1", new
        {
            title = "X",
            sortOrder = 0
        });

        res.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Update_validates_fields()
    {
        var mechId = await SeedUserAsync("Mechanic");
        var client = _factory.CreateClient().AsUser(userId: mechId, roles: "Mechanic");

        (await client.PutAsJsonAsync("/api/work-order-tasks/1", new { title = "   ", sortOrder = 0 }))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);

        (await client.PutAsJsonAsync("/api/work-order-tasks/1", new { title = "T", sortOrder = -1 }))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);

        (await client.PutAsJsonAsync("/api/work-order-tasks/1", new { title = "T", sortOrder = 0, estimatedMinutes = -1 }))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Update_returns_404_when_missing()
    {
        var mechId = await SeedUserAsync("Mechanic");
        var client = _factory.CreateClient().AsUser(userId: mechId, roles: "Mechanic");

        var res = await client.PutAsJsonAsync("/api/work-order-tasks/999999", new
        {
            title = "Task",
            description = "Desc",
            status = "Done",
            sortOrder = 1,
            estimatedMinutes = 10,
            completedAt = (DateTime?)null
        });

        res.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Update_blank_status_keeps_existing_and_persists_other_fields()
    {
        var mechId = await SeedUserAsync("Mechanic");
        var driverId = await SeedUserAsync("Driver");
        var carId = await SeedCarAsync();
        var woId = await SeedWorkOrderAsync(carId, driverId);

        var taskId = await SeedTaskAsync(woId, sortOrder: 0, title: "Old", status: "InProgress");

        var client = _factory.CreateClient().AsUser(userId: mechId, roles: "Mechanic");

        var completedAt = DateTime.UtcNow;

        var res = await client.PutAsJsonAsync($"/api/work-order-tasks/{taskId}", new
        {
            title = "  New  ",
            description = "  NewDesc  ",
            status = "   ",
            sortOrder = 5,
            estimatedMinutes = 25,
            completedAt
        });

        res.StatusCode.Should().Be(HttpStatusCode.NoContent);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var t = await db.WorkOrderTasks.AsNoTracking().FirstAsync(x => x.Id == taskId);
        t.Title.Should().Be("New");
        t.Description.Should().Be("NewDesc");
        t.Status.Should().Be("InProgress");
        t.SortOrder.Should().Be(5);
        t.EstimatedMinutes.Should().Be(25);
        t.CompletedAt.Should().Be(completedAt);
    }

    [Fact]
    public async Task Delete_requires_auth()
    {
        var res = await _factory.CreateClient().AsAnonymous()
            .DeleteAsync("/api/work-order-tasks/1");

        res.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Delete_requires_role()
    {
        var driverId = await SeedUserAsync("Driver");
        var client = _factory.CreateClient().AsUser(userId: driverId, roles: "Driver");

        var res = await client.DeleteAsync("/api/work-order-tasks/1");

        res.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Delete_returns_404_when_missing()
    {
        var mechId = await SeedUserAsync("Mechanic");
        var client = _factory.CreateClient().AsUser(userId: mechId, roles: "Mechanic");

        var res = await client.DeleteAsync("/api/work-order-tasks/999999");

        res.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Delete_valid_returns_204_and_removes_row()
    {
        var mechId = await SeedUserAsync("Mechanic");
        var driverId = await SeedUserAsync("Driver");
        var carId = await SeedCarAsync();
        var woId = await SeedWorkOrderAsync(carId, driverId);

        var taskId = await SeedTaskAsync(woId, sortOrder: 0, title: "To Delete");

        var client = _factory.CreateClient().AsUser(userId: mechId, roles: "Mechanic");

        var res = await client.DeleteAsync($"/api/work-order-tasks/{taskId}");
        res.StatusCode.Should().Be(HttpStatusCode.NoContent);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        (await db.WorkOrderTasks.AnyAsync(t => t.Id == taskId)).Should().BeFalse();
    }
}