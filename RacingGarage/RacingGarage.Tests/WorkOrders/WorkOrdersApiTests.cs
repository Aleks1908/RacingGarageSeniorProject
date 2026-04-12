using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RacingGarage.Data;
using RacingGarage.Models;
using Xunit;

namespace RacingGarage.Tests.WorkOrders;

public class WorkOrdersApiTests : IClassFixture<TestAppFactory>
{
    private readonly TestAppFactory _factory;

    public WorkOrdersApiTests(TestAppFactory factory) => _factory = factory;
    
    private static int GetInt(JsonElement root, string propName)
    {
        root.TryGetProperty(propName, out var p).Should().BeTrue($"Response should contain '{propName}'");
        return p.GetInt32();
    }
    
    private async Task SetCarStatusAsync(int carId, string status)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var car = await db.TeamCars.FirstAsync(c => c.Id == carId);
        car.Status = status;
        await db.SaveChangesAsync();
    }

    private async Task<string> GetCarStatusAsync(int carId)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var car = await db.TeamCars.AsNoTracking().FirstAsync(c => c.Id == carId);
        return car.Status ?? "";
    }

    private static string Unique(string prefix) => $"{prefix}-{Guid.NewGuid():N}".Substring(0, 22);

    private async Task<int> SeedUserAsync(string name, string emailPrefix = "u")
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var u = new AppUser
        {
            Name = name,
            Email = $"{Unique(emailPrefix)}@test.local",
            PasswordHash = "x",
        };

        db.Users.Add(u);
        await db.SaveChangesAsync();
        return u.Id;
    }

    private async Task<int> SeedCarAsync(string status = "Active", string? carNumber = null)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var car = new TeamCar
        {
            CarNumber = carNumber ?? Unique("CAR"),
            Make = "TestMake",
            Model = "TestModel",
            Status = status
        };

        db.TeamCars.Add(car);
        await db.SaveChangesAsync();
        return car.Id;
    }

    private async Task<int> SeedCarSessionAsync(int carId, int? driverUserId = null)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var s = new CarSession
        {
            TeamCarId = carId,
            SessionType = "Practice",
            Date = DateOnly.FromDateTime(DateTime.UtcNow),
            TrackName = "TestTrack",
            DriverUserId = driverUserId,
            Laps = 5,
            Notes = ""
        };

        db.CarSessions.Add(s);
        await db.SaveChangesAsync();
        return s.Id;
    }

    private async Task<int> SeedIssueAsync(int carId, int reportedByUserId, string status = "Open")
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var issue = new IssueReport
        {
            TeamCarId = carId,
            CarSessionId = null,
            ReportedByUserId = reportedByUserId,
            Title = Unique("Issue"),
            Description = "",
            Severity = "Medium",
            Status = status,
            ReportedAt = DateTime.UtcNow,
            ClosedAt = null,
            LinkedWorkOrderId = null
        };

        db.IssueReports.Add(issue);
        await db.SaveChangesAsync();
        return issue.Id;
    }

    private async Task<int> SeedWorkOrderAsync(
        int carId,
        int createdByUserId,
        string status = "Open",
        string priority = "Medium",
        int? assignedToUserId = null,
        int? carSessionId = null,
        int? linkedIssueId = null)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var wo = new WorkOrder
        {
            TeamCarId = carId,
            CreatedByUserId = createdByUserId,
            AssignedToUserId = assignedToUserId,
            CarSessionId = carSessionId,

            Title = Unique("WO"),
            Description = "",
            Priority = priority,
            Status = status,
            CreatedAt = DateTime.UtcNow,
            DueDate = null,
            ClosedAt = null,
            LinkedIssueId = linkedIssueId
        };

        db.WorkOrders.Add(wo);
        await db.SaveChangesAsync();
        return wo.Id;
    }

    private async Task<(int taskId1, int taskId2)> SeedTasksAsync(int workOrderId)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var t1 = new WorkOrderTask
        {
            WorkOrderId = workOrderId,
            Title = "Task 1",
            Description = "",
            Status = "Open",
            SortOrder = 1,
            EstimatedMinutes = 30,
            CompletedAt = null
        };

        var t2 = new WorkOrderTask
        {
            WorkOrderId = workOrderId,
            Title = "Task 2",
            Description = "",
            Status = "Open",
            SortOrder = 2,
            EstimatedMinutes = 45,
            CompletedAt = null
        };

        db.WorkOrderTasks.AddRange(t1, t2);
        await db.SaveChangesAsync();
        return (t1.Id, t2.Id);
    }

    private async Task SeedLaborAsync(int taskId, int mechanicUserId, int minutes)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var log = new LaborLog
        {
            WorkOrderTaskId = taskId,
            MechanicUserId = mechanicUserId,
            Minutes = minutes,
            LogDate = DateOnly.FromDateTime(DateTime.UtcNow),
            Comment = ""
        };

        db.LaborLogs.Add(log);
        await db.SaveChangesAsync();
    }

    private async Task<(int partId, int locId)> SeedPartAndLocationAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var supplier = new Supplier
        {
            Name = Unique("Supplier"),
            ContactEmail = "",
            Phone = "",
            AddressLine1 = "",
            AddressLine2 = "",
            City = "",
            Country = "",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        db.Suppliers.Add(supplier);
        await db.SaveChangesAsync();

        var part = new Part
        {
            Name = "Brake Pads",
            Sku = Unique("SKU").ToUpperInvariant(),
            Category = "Brakes",
            UnitCost = 10m,
            ReorderPoint = 0,
            SupplierId = supplier.Id,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        var loc = new InventoryLocation
        {
            Name = "Main",
            Code = Unique("LOC").ToUpperInvariant(),
            Description = "",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        db.Parts.Add(part);
        db.InventoryLocations.Add(loc);
        await db.SaveChangesAsync();

        return (part.Id, loc.Id);
    }

    private async Task SeedInstallAsync(int workOrderId, int partId, int locId, int installedByUserId, int qty)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var install = new PartInstallation
        {
            WorkOrderId = workOrderId,
            PartId = partId,
            InventoryLocationId = locId,
            Quantity = qty,
            InstalledByUserId = installedByUserId,
            InstalledAt = DateTime.UtcNow,
            Notes = ""
        };

        db.PartInstallations.Add(install);
        await db.SaveChangesAsync();
    }

    [Fact]
    public async Task GetAll_returns_200_for_authenticated_user()
    {
        var client = _factory.CreateClient().AsUser(userId: 1, roles: "Driver");

        var res = await client.GetAsync("/api/work-orders");

        res.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetAll_filters_by_teamCarId_status_priority()
    {
        var creatorId = await SeedUserAsync("Creator");
        var carA = await SeedCarAsync();
        var carB = await SeedCarAsync();

        var woA1 = await SeedWorkOrderAsync(carA, creatorId, status: "Open", priority: "High");
        _ = await SeedWorkOrderAsync(carA, creatorId, status: "Closed", priority: "High");
        _ = await SeedWorkOrderAsync(carB, creatorId, status: "Open", priority: "High");

        var client = _factory.CreateClient().AsUser(userId: creatorId, roles: "Driver");

        var res = await client.GetAsync($"/api/work-orders?teamCarId={carA}&status=Open&priority=High");
        res.StatusCode.Should().Be(HttpStatusCode.OK);

        var list = await res.Content.ReadFromJsonAsync<List<dynamic>>();
        list.Should().NotBeNull();
        list!.Count.Should().Be(1);
    }

    [Fact]
    public async Task GetById_returns_404_when_missing()
    {
        var client = _factory.CreateClient().AsUser(userId: 1, roles: "Driver");

        var res = await client.GetAsync("/api/work-orders/999999");

        res.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetById_returns_200_when_exists()
    {
        var creatorId = await SeedUserAsync("Creator");
        var carId = await SeedCarAsync();
        var woId = await SeedWorkOrderAsync(carId, creatorId);

        var client = _factory.CreateClient().AsUser(userId: creatorId, roles: "Driver");

        var res = await client.GetAsync($"/api/work-orders/{woId}");

        res.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Create_requires_role_driver_or_mechanic()
    {
        var creatorId = await SeedUserAsync("Creator");
        var carId = await SeedCarAsync();

        var client = _factory.CreateClient().AsUser(userId: creatorId, roles: "PartsClerk");

        var res = await client.PostAsJsonAsync("/api/work-orders", new
        {
            teamCarId = carId,
            title = "Test WO"
        });

        res.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Create_valid_as_driver_sets_defaults_and_sets_car_to_service_when_open()
    {
        var driverId = await SeedUserAsync("Driver");
        var carId = await SeedCarAsync(status: "Active");

        var client = _factory.CreateClient().AsUser(userId: driverId, roles: "Driver");

        var res = await client.PostAsJsonAsync("/api/work-orders", new
        {
            teamCarId = carId,
            title = "New WO",
            description = "  desc  ",
            priority = "   ",
            status = "   " 
        });

        res.StatusCode.Should().Be(HttpStatusCode.Created);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var car = await db.TeamCars.FirstAsync(c => c.Id == carId);
        car.Status.Should().Be("Service");
    }

    [Fact]
    public async Task Create_rejects_missing_title()
    {
        var driverId = await SeedUserAsync("Driver");
        var carId = await SeedCarAsync();

        var client = _factory.CreateClient().AsUser(userId: driverId, roles: "Driver");

        var res = await client.PostAsJsonAsync("/api/work-orders", new
        {
            teamCarId = carId,
            title = "   "
        });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Create_rejects_missing_teamCarId()
    {
        var driverId = await SeedUserAsync("Driver");
        var client = _factory.CreateClient().AsUser(userId: driverId, roles: "Driver");

        var res = await client.PostAsJsonAsync("/api/work-orders", new
        {
            teamCarId = 0,
            title = "X"
        });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Create_rejects_assignedToUserId_when_user_missing()
    {
        var driverId = await SeedUserAsync("Driver");
        var carId = await SeedCarAsync();

        var client = _factory.CreateClient().AsUser(userId: driverId, roles: "Driver");

        var res = await client.PostAsJsonAsync("/api/work-orders", new
        {
            teamCarId = carId,
            title = "WO",
            assignedToUserId = 999999
        });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Create_rejects_carSessionId_when_session_missing()
    {
        var driverId = await SeedUserAsync("Driver");
        var carId = await SeedCarAsync();

        var client = _factory.CreateClient().AsUser(userId: driverId, roles: "Driver");

        var res = await client.PostAsJsonAsync("/api/work-orders", new
        {
            teamCarId = carId,
            title = "WO",
            carSessionId = 999999
        });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Create_with_linkedIssue_links_issue_and_sets_issue_status_linked()
    {
        var driverId = await SeedUserAsync("Driver");
        var carId = await SeedCarAsync(status: "Active");
        var issueId = await SeedIssueAsync(carId, reportedByUserId: driverId, status: "Open");

        var client = _factory.CreateClient().AsUser(userId: driverId, roles: "Driver");

        var res = await client.PostAsJsonAsync("/api/work-orders", new
        {
            teamCarId = carId,
            title = "WO",
            linkedIssueId = issueId,
            status = "Open"
        });

        res.StatusCode.Should().Be(HttpStatusCode.Created);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var wo = await db.WorkOrders.OrderByDescending(w => w.Id).FirstAsync();
        wo.LinkedIssueId.Should().Be(issueId);

        var issue = await db.IssueReports.FirstAsync(i => i.Id == issueId);
        issue.LinkedWorkOrderId.Should().Be(wo.Id);
        issue.Status.Should().Be("Linked");
        issue.ClosedAt.Should().BeNull();
    }

    [Fact]
    public async Task Update_requires_mechanic_role()
    {
        var creatorId = await SeedUserAsync("Creator");
        var driverId = await SeedUserAsync("Driver");
        var carId = await SeedCarAsync();
        var woId = await SeedWorkOrderAsync(carId, creatorId);

        var client = _factory.CreateClient().AsUser(userId: driverId, roles: "Driver");

        var res = await client.PutAsJsonAsync($"/api/work-orders/{woId}", new
        {
            teamCarId = carId,
            title = "Updated",
            description = "",
            priority = "High",
            status = "Open",
            dueDate = (string?)null,
            closedAt = (string?)null,
            assignedToUserId = (int?)null,
            carSessionId = (int?)null,
            linkedIssueId = (int?)null
        });

        res.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Update_returns_404_when_missing()
    {
        var mechId = await SeedUserAsync("Mechanic");

        var client = _factory.CreateClient().AsUser(userId: mechId, roles: "Mechanic");

        var res = await client.PutAsJsonAsync("/api/work-orders/999999", new
        {
            teamCarId = 1,
            title = "X",
            description = "",
            priority = "High",
            status = "Open",
            dueDate = (string?)null,
            closedAt = (string?)null,
            assignedToUserId = (int?)null,
            carSessionId = (int?)null,
            linkedIssueId = (int?)null
        });

        res.StatusCode.Should().BeOneOf(HttpStatusCode.BadRequest, HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Update_closing_workorder_closes_linked_issue_and_sets_car_active_when_no_other_open()
    {
        var creatorId = await SeedUserAsync("Creator");
        var mechId = await SeedUserAsync("Mechanic");
        var carId = await SeedCarAsync(status: "Active");

        var issueId = await SeedIssueAsync(carId, creatorId, status: "Open");
        var woId = await SeedWorkOrderAsync(carId, creatorId, status: "Open", linkedIssueId: issueId);
        
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var issue = await db.IssueReports.FirstAsync(i => i.Id == issueId);
            issue.LinkedWorkOrderId = woId;
            issue.Status = "Linked";
            await db.SaveChangesAsync();
        }

        var client = _factory.CreateClient().AsUser(userId: mechId, roles: "Mechanic");

        var res = await client.PutAsJsonAsync($"/api/work-orders/{woId}", new
        {
            teamCarId = carId,
            title = "WO Closed",
            description = "",
            priority = "Medium",
            status = "Closed",
            dueDate = (string?)null,
            closedAt = (string?)null,
            assignedToUserId = (int?)null,
            carSessionId = (int?)null,
            linkedIssueId = issueId
        });

        res.StatusCode.Should().Be(HttpStatusCode.NoContent);

        using var scope2 = _factory.Services.CreateScope();
        var db2 = scope2.ServiceProvider.GetRequiredService<AppDbContext>();

        var issue2 = await db2.IssueReports.FirstAsync(i => i.Id == issueId);
        issue2.Status.Should().Be("Closed");
        issue2.ClosedAt.Should().NotBeNull();

        var car = await db2.TeamCars.FirstAsync(c => c.Id == carId);
        car.Status.Should().Be("Active"); 
    }

    [Fact]
    public async Task Delete_with_driver_is_forbidden()
    {
        var creatorId = await SeedUserAsync("Creator");
        var driverId = await SeedUserAsync("Driver");
        var carId = await SeedCarAsync();
        var woId = await SeedWorkOrderAsync(carId, creatorId);

        var client = _factory.CreateClient().AsUser(userId: driverId, roles: "Driver");

        var res = await client.DeleteAsync($"/api/work-orders/{woId}");

        res.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Delete_with_mechanic_returns_204_and_removes_workorder()
    {
        var creatorId = await SeedUserAsync("Creator");
        var mechId = await SeedUserAsync("Mechanic");
        var carId = await SeedCarAsync(status: "Service");
        var woId = await SeedWorkOrderAsync(carId, creatorId, status: "Open");

        var client = _factory.CreateClient().AsUser(userId: mechId, roles: "Mechanic");

        var res = await client.DeleteAsync($"/api/work-orders/{woId}");

        res.StatusCode.Should().Be(HttpStatusCode.NoContent);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        (await db.WorkOrders.AnyAsync(w => w.Id == woId)).Should().BeFalse();
    }

    [Fact]
    public async Task Delete_unlinks_issue_if_linked()
    {
        var creatorId = await SeedUserAsync("Creator");
        var mechId = await SeedUserAsync("Mechanic");
        var carId = await SeedCarAsync(status: "Service");

        var issueId = await SeedIssueAsync(carId, creatorId, status: "Linked");
        var woId = await SeedWorkOrderAsync(carId, creatorId, status: "Open", linkedIssueId: issueId);

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var issue = await db.IssueReports.FirstAsync(i => i.Id == issueId);
            issue.LinkedWorkOrderId = woId;
            await db.SaveChangesAsync();
        }

        var client = _factory.CreateClient().AsUser(userId: mechId, roles: "Mechanic");

        var res = await client.DeleteAsync($"/api/work-orders/{woId}");
        res.StatusCode.Should().Be(HttpStatusCode.NoContent);

        using var scope2 = _factory.Services.CreateScope();
        var db2 = scope2.ServiceProvider.GetRequiredService<AppDbContext>();

        var issue2 = await db2.IssueReports.FirstAsync(i => i.Id == issueId);
        issue2.LinkedWorkOrderId.Should().BeNull();
    }


    [Fact]
    public async Task Details_returns_404_when_missing()
    {
        var client = _factory.CreateClient().AsUser(userId: 1, roles: "Driver");

        var res = await client.GetAsync("/api/work-orders/999999/details");

        res.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
    [Fact]
    public async Task Details_returns_totals_tasks_labor_and_installs()
    {
        var creatorId = await SeedUserAsync("Creator");
        var mechId = await SeedUserAsync("Mechanic");
        var carId = await SeedCarAsync();
        var woId = await SeedWorkOrderAsync(carId, creatorId);

        var (t1, t2) = await SeedTasksAsync(woId);
        await SeedLaborAsync(t1, mechId, minutes: 30);
        await SeedLaborAsync(t2, mechId, minutes: 15);

        var (partId, locId) = await SeedPartAndLocationAsync();
        await SeedInstallAsync(woId, partId, locId, installedByUserId: mechId, qty: 2);
        await SeedInstallAsync(woId, partId, locId, installedByUserId: mechId, qty: 1);

        var client = _factory.CreateClient().AsUser(userId: creatorId, roles: "Driver");

        var res = await client.GetAsync($"/api/work-orders/{woId}/details");

        res.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await res.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;

        var totalLabor = GetInt(root, "totalLaborMinutes");
        var totalParts = GetInt(root, "totalInstalledPartsQty");

        totalLabor.Should().Be(45);
        totalParts.Should().Be(3);

        root.TryGetProperty("tasks", out var tasks).Should().BeTrue();
        tasks.ValueKind.Should().Be(JsonValueKind.Array);
        tasks.GetArrayLength().Should().Be(2);

        root.TryGetProperty("laborLogs", out var laborLogs).Should().BeTrue();
        laborLogs.ValueKind.Should().Be(JsonValueKind.Array);
        laborLogs.GetArrayLength().Should().Be(2);

        root.TryGetProperty("partInstallations", out var installs).Should().BeTrue();
        installs.ValueKind.Should().Be(JsonValueKind.Array);
        installs.GetArrayLength().Should().Be(2);
    }
    
    [Fact]
    public async Task Create_does_not_change_retired_car_status()
    {
        var driverId = await SeedUserAsync("Driver");
        var carId = await SeedCarAsync(status: "Retired");

        var client = _factory.CreateClient().AsUser(userId: driverId, roles: "Driver");

        var res = await client.PostAsJsonAsync("/api/work-orders", new
        {
            teamCarId = carId,
            title = "New WO",
            status = "Open"
        });

        res.StatusCode.Should().Be(HttpStatusCode.Created);

        (await GetCarStatusAsync(carId)).Should().Be("Retired");
    }
    
    [Fact]
    public async Task Delete_keeps_car_service_when_other_open_workorder_exists()
    {
        var creatorId = await SeedUserAsync("Creator");
        var mechId = await SeedUserAsync("Mechanic");
        var carId = await SeedCarAsync(status: "Service");

        var woToDelete = await SeedWorkOrderAsync(carId, creatorId, status: "Open");
        _ = await SeedWorkOrderAsync(carId, creatorId, status: "Open");

        var client = _factory.CreateClient().AsUser(userId: mechId, roles: "Mechanic");

        var res = await client.DeleteAsync($"/api/work-orders/{woToDelete}");
        res.StatusCode.Should().Be(HttpStatusCode.NoContent);

        (await GetCarStatusAsync(carId)).Should().Be("Service");
    }
    
    [Fact]
    public async Task Delete_sets_car_active_when_last_open_workorder_removed()
    {
        var creatorId = await SeedUserAsync("Creator");
        var mechId = await SeedUserAsync("Mechanic");
        var carId = await SeedCarAsync(status: "Service");

        var woId = await SeedWorkOrderAsync(carId, creatorId, status: "Open");

        var client = _factory.CreateClient().AsUser(userId: mechId, roles: "Mechanic");

        var res = await client.DeleteAsync($"/api/work-orders/{woId}");
        res.StatusCode.Should().Be(HttpStatusCode.NoContent);

        (await GetCarStatusAsync(carId)).Should().Be("Active");
    }
    
    [Fact]
    public async Task Create_with_linkedIssue_from_different_car_throws()
    {
        var driverId = await SeedUserAsync("Driver");

        var carA = await SeedCarAsync();
        var carB = await SeedCarAsync();

        var issueOnB = await SeedIssueAsync(carB, reportedByUserId: driverId, status: "Open");

        var client = _factory.CreateClient().AsUser(userId: driverId, roles: "Driver");

        Func<Task> act = async () =>
        {
            await client.PostAsJsonAsync("/api/work-orders", new
            {
                teamCarId = carA,
                title = "WO",
                linkedIssueId = issueOnB
            });
        };

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*different cars*");
    }
    
    [Fact]
    public async Task Create_with_issue_already_linked_to_another_workorder_throws()
    {
        var driverId = await SeedUserAsync("Driver");
        var creatorId = await SeedUserAsync("Creator");

        var carId = await SeedCarAsync();

        var issueId = await SeedIssueAsync(carId, reportedByUserId: driverId, status: "Open");
        var existingWoId = await SeedWorkOrderAsync(carId, creatorId, status: "Open");

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var issue = await db.IssueReports.FirstAsync(i => i.Id == issueId);
            issue.LinkedWorkOrderId = existingWoId;
            issue.Status = "Linked";
            await db.SaveChangesAsync();
        }

        var client = _factory.CreateClient().AsUser(userId: driverId, roles: "Driver");

        Func<Task> act = async () =>
        {
            await client.PostAsJsonAsync("/api/work-orders", new
            {
                teamCarId = carId,
                title = "New WO",
                linkedIssueId = issueId
            });
        };

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*already linked*");
    }
    
    [Fact]
    public async Task Update_backfills_linkedIssueId_from_issue_linked_workorder()
    {
        var creatorId = await SeedUserAsync("Creator");
        var mechId = await SeedUserAsync("Mechanic");
        var carId = await SeedCarAsync();

        var woId = await SeedWorkOrderAsync(carId, creatorId, status: "Open", linkedIssueId: null);
        var issueId = await SeedIssueAsync(carId, reportedByUserId: creatorId, status: "Linked");

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var issue = await db.IssueReports.FirstAsync(i => i.Id == issueId);
            issue.LinkedWorkOrderId = woId;
            await db.SaveChangesAsync();
        }

        var client = _factory.CreateClient().AsUser(userId: mechId, roles: "Mechanic");

        var res = await client.PutAsJsonAsync($"/api/work-orders/{woId}", new
        {
            teamCarId = carId,
            title = "Updated",
            description = "",
            priority = "Medium",
            status = "Open",
            dueDate = (string?)null,
            closedAt = (string?)null,
            assignedToUserId = (int?)null,
            carSessionId = (int?)null,
            linkedIssueId = (int?)null
        });

        res.StatusCode.Should().Be(HttpStatusCode.NoContent);

        using var scope2 = _factory.Services.CreateScope();
        var db2 = scope2.ServiceProvider.GetRequiredService<AppDbContext>();
        var wo = await db2.WorkOrders.FirstAsync(w => w.Id == woId);
        wo.LinkedIssueId.Should().Be(issueId);
    }
    
    [Fact]
    public async Task Update_reopening_workorder_sets_linked_issue_to_linked_and_clears_closedAt()
    {
        var creatorId = await SeedUserAsync("Creator");
        var mechId = await SeedUserAsync("Mechanic");
        var carId = await SeedCarAsync(status: "Active");

        var issueId = await SeedIssueAsync(carId, creatorId, status: "Closed");
        var woId = await SeedWorkOrderAsync(carId, creatorId, status: "Closed", linkedIssueId: issueId);

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var issue = await db.IssueReports.FirstAsync(i => i.Id == issueId);
            issue.LinkedWorkOrderId = woId;
            issue.Status = "Closed";
            issue.ClosedAt = DateTime.UtcNow.AddDays(-1);
            await db.SaveChangesAsync();
        }

        var client = _factory.CreateClient().AsUser(userId: mechId, roles: "Mechanic");

        var res = await client.PutAsJsonAsync($"/api/work-orders/{woId}", new
        {
            teamCarId = carId,
            title = "WO Reopened",
            description = "",
            priority = "Medium",
            status = "Open",
            dueDate = (string?)null,
            closedAt = (string?)null,
            assignedToUserId = (int?)null,
            carSessionId = (int?)null,
            linkedIssueId = issueId
        });

        res.StatusCode.Should().Be(HttpStatusCode.NoContent);

        using var scope2 = _factory.Services.CreateScope();
        var db2 = scope2.ServiceProvider.GetRequiredService<AppDbContext>();

        var issue2 = await db2.IssueReports.FirstAsync(i => i.Id == issueId);
        issue2.Status.Should().Be("Linked");
        issue2.ClosedAt.Should().BeNull();
    }
}