using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RacingGarage.Data;
using RacingGarage.dto;
using RacingGarage.Dto;
using RacingGarage.Models;
using Xunit;

namespace RacingGarage.Tests.TeamCars;

public class TeamCarsApiTests : IClassFixture<TestAppFactory>
{
    private readonly TestAppFactory _factory;

    public TeamCarsApiTests(TestAppFactory factory) => _factory = factory;

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
            Name = name ?? $"User {roleName} {U("N")}",
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

    private async Task<int> SeedCarAsync(string? carNumber = null, string status = "Active")
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
            Status = status,
            OdometerKm = 123,
            CreatedAt = DateTime.UtcNow
        };

        db.TeamCars.Add(car);
        await db.SaveChangesAsync();
        return car.Id;
    }

    private async Task<int> SeedCarSessionAsync(int teamCarId, DateOnly date, int? driverUserId = null, string track = "Track A")
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var s = new CarSession
        {
            TeamCarId = teamCarId,
            SessionType = "Practice",
            Date = date,
            TrackName = track,
            DriverUserId = driverUserId,
            Laps = 10,
            Notes = ""
        };

        db.CarSessions.Add(s);
        await db.SaveChangesAsync();
        return s.Id;
    }

    private async Task<int> SeedIssueAsync(int teamCarId, int reportedByUserId, string status = "Open", DateTime? reportedAtUtc = null)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var issue = new IssueReport
        {
            TeamCarId = teamCarId,
            CarSessionId = null,
            ReportedByUserId = reportedByUserId,
            Title = "Issue " + U("I"),
            Description = "",
            Severity = "Medium",
            Status = status,
            ReportedAt = reportedAtUtc ?? DateTime.UtcNow,
            ClosedAt = null,
            LinkedWorkOrderId = null
        };

        db.IssueReports.Add(issue);
        await db.SaveChangesAsync();
        return issue.Id;
    }

    private async Task<int> SeedWorkOrderAsync(int teamCarId, int createdByUserId, string status = "Open", DateTime? createdAtUtc = null)
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
            CreatedAt = createdAtUtc ?? DateTime.UtcNow,
            DueDate = null,
            ClosedAt = null,
            LinkedIssueId = null
        };

        db.WorkOrders.Add(wo);
        await db.SaveChangesAsync();
        return wo.Id;
    }

    [Fact]
    public async Task GetAll_returns_200_for_authenticated_user()
    {
        var userId = await SeedUserAsync("Driver");
        var client = _factory.CreateClient().AsUser(userId: userId, roles: "Driver");

        var res = await client.GetAsync("/api/team-cars");

        res.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetAll_returns_ordered_by_carNumber()
    {
        var userId = await SeedUserAsync("Driver");
        var c2 = await SeedCarAsync("200");
        var c1 = await SeedCarAsync("100");

        var client = _factory.CreateClient().AsUser(userId: userId, roles: "Driver");

        var res = await client.GetAsync("/api/team-cars");
        res.StatusCode.Should().Be(HttpStatusCode.OK);

        var list = await res.Content.ReadFromJsonAsync<List<TeamCarReadDto>>();
        list.Should().NotBeNull();

        var idx100 = list!.FindIndex(x => x.Id == c1);
        var idx200 = list.FindIndex(x => x.Id == c2);

        idx100.Should().BeGreaterThanOrEqualTo(0);
        idx200.Should().BeGreaterThanOrEqualTo(0);
        idx100.Should().BeLessThan(idx200);
    }

    [Fact]
    public async Task GetById_returns_404_when_missing()
    {
        var userId = await SeedUserAsync("Driver");
        var client = _factory.CreateClient().AsUser(userId: userId, roles: "Driver");

        var res = await client.GetAsync("/api/team-cars/999999");

        res.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetById_returns_200_and_shape_when_exists()
    {
        var userId = await SeedUserAsync("Driver");
        var carId = await SeedCarAsync("777", status: "Active");

        var client = _factory.CreateClient().AsUser(userId: userId, roles: "Driver");

        var res = await client.GetAsync($"/api/team-cars/{carId}");
        res.StatusCode.Should().Be(HttpStatusCode.OK);

        var dto = await res.Content.ReadFromJsonAsync<TeamCarReadDto>();
        dto.Should().NotBeNull();
        dto!.Id.Should().Be(carId);
        dto.CarNumber.Should().Be("777");
        dto.Status.Should().Be("Active");
    }

    [Fact]
    public async Task Create_requires_auth()
    {
        var res = await _factory.CreateClient().AsAnonymous()
            .PostAsJsonAsync("/api/team-cars", new { });

        res.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Create_requires_role()
    {
        var userId = await SeedUserAsync("Driver");
        var client = _factory.CreateClient().AsUser(userId: userId, roles: "Driver");

        var res = await client.PostAsJsonAsync("/api/team-cars", new
        {
            carNumber = U("CN"),
            nickname = "Nick",
            make = "Make",
            model = "Model",
            year = 2020,
            carClass = "GT",
            status = "Active",
            odometerKm = 10
        });

        res.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Create_requires_carNumber()
    {
        var mechId = await SeedUserAsync("Mechanic");
        var client = _factory.CreateClient().AsUser(userId: mechId, roles: "Mechanic");

        var res = await client.PostAsJsonAsync("/api/team-cars", new
        {
            carNumber = "   ",
            nickname = "Nick",
            make = "Make",
            model = "Model",
            year = 2020,
            carClass = "GT",
            status = "Active",
            odometerKm = 10
        });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Create_duplicate_carNumber_returns_409()
    {
        var mechId = await SeedUserAsync("Mechanic");
        _ = await SeedCarAsync("DUP-123");

        var client = _factory.CreateClient().AsUser(userId: mechId, roles: "Mechanic");

        var res = await client.PostAsJsonAsync("/api/team-cars", new
        {
            carNumber = "DUP-123",
            nickname = "Nick",
            make = "Make",
            model = "Model",
            year = 2020,
            carClass = "GT",
            status = "Active",
            odometerKm = 10
        });

        res.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Create_valid_returns_201_and_defaults_status_when_blank()
    {
        var mechId = await SeedUserAsync("Mechanic");
        var client = _factory.CreateClient().AsUser(userId: mechId, roles: "Mechanic");

        var carNumber = U("CN");

        var res = await client.PostAsJsonAsync("/api/team-cars", new
        {
            carNumber,
            nickname = "  Nick  ",
            make = "  Make  ",
            model = "  Model  ",
            year = 2021,
            carClass = "  GT  ",
            status = "   ",
            odometerKm = 77
        });

        res.StatusCode.Should().Be(HttpStatusCode.Created);

        var dto = await res.Content.ReadFromJsonAsync<TeamCarReadDto>();
        dto.Should().NotBeNull();
        dto!.CarNumber.Should().Be(carNumber.Trim());
        dto.Nickname.Should().Be("Nick");
        dto.Make.Should().Be("Make");
        dto.Model.Should().Be("Model");
        dto.CarClass.Should().Be("GT");
        dto.Status.Should().Be("Active");
        dto.OdometerKm.Should().Be(77);
    }

    [Fact]
    public async Task Update_requires_auth()
    {
        var carId = await SeedCarAsync();

        var res = await _factory.CreateClient().AsAnonymous()
            .PutAsJsonAsync($"/api/team-cars/{carId}", new { });

        res.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Update_requires_role()
    {
        var userId = await SeedUserAsync("Driver");
        var carId = await SeedCarAsync();

        var client = _factory.CreateClient().AsUser(userId: userId, roles: "Driver");

        var res = await client.PutAsJsonAsync($"/api/team-cars/{carId}", new
        {
            carNumber = U("CN"),
            nickname = "Nick",
            make = "Make",
            model = "Model",
            year = 2020,
            carClass = "GT",
            status = "Active",
            odometerKm = 10
        });

        res.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Update_requires_carNumber()
    {
        var mechId = await SeedUserAsync("Mechanic");
        var carId = await SeedCarAsync();

        var client = _factory.CreateClient().AsUser(userId: mechId, roles: "Mechanic");

        var res = await client.PutAsJsonAsync($"/api/team-cars/{carId}", new
        {
            carNumber = "",
            nickname = "Nick",
            make = "Make",
            model = "Model",
            year = 2020,
            carClass = "GT",
            status = "Active",
            odometerKm = 10
        });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Update_returns_404_when_missing()
    {
        var mechId = await SeedUserAsync("Mechanic");
        var client = _factory.CreateClient().AsUser(userId: mechId, roles: "Mechanic");

        var res = await client.PutAsJsonAsync("/api/team-cars/999999", new
        {
            carNumber = U("CN"),
            nickname = "Nick",
            make = "Make",
            model = "Model",
            year = 2020,
            carClass = "GT",
            status = "Active",
            odometerKm = 10
        });

        res.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Update_duplicate_carNumber_returns_409()
    {
        var mechId = await SeedUserAsync("Mechanic");
        var carId1 = await SeedCarAsync("CAR-AAA");
        _ = await SeedCarAsync("CAR-BBB");

        var client = _factory.CreateClient().AsUser(userId: mechId, roles: "Mechanic");

        var res = await client.PutAsJsonAsync($"/api/team-cars/{carId1}", new
        {
            carNumber = "CAR-BBB",
            nickname = "Nick",
            make = "Make",
            model = "Model",
            year = 2020,
            carClass = "GT",
            status = "Active",
            odometerKm = 10
        });

        res.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Update_valid_returns_204_and_persists_changes_and_keeps_status_when_blank()
    {
        var mechId = await SeedUserAsync("Mechanic");
        var carId = await SeedCarAsync("CAR-ORIG", status: "Service");

        var client = _factory.CreateClient().AsUser(userId: mechId, roles: "Mechanic");

        var res = await client.PutAsJsonAsync($"/api/team-cars/{carId}", new
        {
            carNumber = "CAR-ORIG",
            nickname = "  NewNick  ",
            make = "  NewMake  ",
            model = "  NewModel  ",
            year = 2022,
            carClass = "  NewClass  ",
            status = "   ",
            odometerKm = 999
        });

        res.StatusCode.Should().Be(HttpStatusCode.NoContent);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var car = await db.TeamCars.AsNoTracking().FirstAsync(x => x.Id == carId);
        car.Nickname.Should().Be("NewNick");
        car.Make.Should().Be("NewMake");
        car.Model.Should().Be("NewModel");
        car.Year.Should().Be(2022);
        car.CarClass.Should().Be("NewClass");
        car.Status.Should().Be("Service");
        car.OdometerKm.Should().Be(999);
    }

    [Fact]
    public async Task Delete_requires_auth()
    {
        var carId = await SeedCarAsync();

        var res = await _factory.CreateClient().AsAnonymous()
            .DeleteAsync($"/api/team-cars/{carId}");

        res.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Delete_requires_role()
    {
        var userId = await SeedUserAsync("Driver");
        var carId = await SeedCarAsync();

        var client = _factory.CreateClient().AsUser(userId: userId, roles: "Driver");

        var res = await client.DeleteAsync($"/api/team-cars/{carId}");

        res.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Delete_returns_404_when_missing()
    {
        var mechId = await SeedUserAsync("Mechanic");
        var client = _factory.CreateClient().AsUser(userId: mechId, roles: "Mechanic");

        var res = await client.DeleteAsync("/api/team-cars/999999");

        res.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Delete_valid_returns_204_and_removes_row()
    {
        var mechId = await SeedUserAsync("Mechanic");
        var carId = await SeedCarAsync();

        var client = _factory.CreateClient().AsUser(userId: mechId, roles: "Mechanic");

        var res = await client.DeleteAsync($"/api/team-cars/{carId}");
        res.StatusCode.Should().Be(HttpStatusCode.NoContent);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var exists = await db.TeamCars.AnyAsync(c => c.Id == carId);
        exists.Should().BeFalse();
    }

    [Fact]
    public async Task Dashboard_returns_404_when_car_missing()
    {
        var userId = await SeedUserAsync("Driver");
        var client = _factory.CreateClient().AsUser(userId: userId, roles: "Driver");

        var res = await client.GetAsync("/api/team-cars/999999/dashboard");

        res.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Dashboard_returns_car_latestSession_openIssues_and_openWorkOrders()
    {
        var driverId = await SeedUserAsync("Driver");
        var reporterId = await SeedUserAsync("Driver", name: "Reporter " + U("R"));

        var carId = await SeedCarAsync("DASH-1", status: "Active");

        var oldDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-2));
        var latestDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-1));

        await SeedCarSessionAsync(carId, oldDate, driverId, track: "OldTrack");
        var latestSessionId = await SeedCarSessionAsync(carId, latestDate, driverId, track: "LatestTrack");

        _ = await SeedIssueAsync(carId, reporterId, status: "Open", reportedAtUtc: DateTime.UtcNow.AddHours(-2));
        _ = await SeedIssueAsync(carId, reporterId, status: "Closed", reportedAtUtc: DateTime.UtcNow.AddHours(-1));

        _ = await SeedWorkOrderAsync(carId, driverId, status: "Open", createdAtUtc: DateTime.UtcNow.AddHours(-3));
        _ = await SeedWorkOrderAsync(carId, driverId, status: "Closed", createdAtUtc: DateTime.UtcNow.AddHours(-1));

        var client = _factory.CreateClient().AsUser(userId: driverId, roles: "Driver");

        var res = await client.GetAsync($"/api/team-cars/{carId}/dashboard");
        res.StatusCode.Should().Be(HttpStatusCode.OK);

        var dash = await res.Content.ReadFromJsonAsync<TeamCarDashboardDto>();
        dash.Should().NotBeNull();

        dash!.Car.Should().NotBeNull();
        dash.Car.Id.Should().Be(carId);
        dash.Car.CarNumber.Should().Be("DASH-1");

        dash.LatestSession.Should().NotBeNull();
        dash.LatestSession!.Id.Should().Be(latestSessionId);
        dash.LatestSession.TrackName.Should().Be("LatestTrack");

        dash.OpenIssues.Should().NotBeNull();
        dash.OpenIssues!.All(i => i.Status != "Closed").Should().BeTrue();

        dash.OpenWorkOrders.Should().NotBeNull();
        dash.OpenWorkOrders!.All(w => w.Status != "Closed").Should().BeTrue();
    }
}