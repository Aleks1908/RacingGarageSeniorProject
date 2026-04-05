using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RacingGarage.Data;
using RacingGarage.Models;
using Xunit;

namespace RacingGarage.Tests.CarSessions;

public class CarSessionsApiTests : IClassFixture<TestAppFactory>
{
    private readonly TestAppFactory _factory;
    private static int _carNumberSeq = 1000;

    public CarSessionsApiTests(TestAppFactory factory) => _factory = factory;

    private sealed class CarSessionRead
    {
        public int Id { get; set; }
        public int TeamCarId { get; set; }
        public int TeamCarNumber { get; set; }
        public string? SessionType { get; set; }
        public DateOnly Date { get; set; }
        public string? TrackName { get; set; }
        public int? DriverUserId { get; set; }
        public string? DriverName { get; set; }
        public int Laps { get; set; }
        public string? Notes { get; set; }
    }

    private async Task<int> SeedUserAsync(string? email = null, string? name = null)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var u = new AppUser
        {
            Name = name ?? "Test User",
            Email = email ?? $"user{Guid.NewGuid():N}@test.local",
            PasswordHash = "x"
        };

        db.Users.Add(u);
        await db.SaveChangesAsync();
        return u.Id;
    }

    private async Task<int> SeedCarAsync(int? carNumber = null)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        
        var num = carNumber ?? Interlocked.Increment(ref _carNumberSeq);

        var car = new TeamCar
        {
            CarNumber = num.ToString(),
            Make = "TestMake",
            Model = "TestModel"
        };

        db.TeamCars.Add(car);
        await db.SaveChangesAsync();
        return car.Id;
    }

    private async Task<int> SeedSessionAsync(
        int teamCarId,
        string sessionType = "Qualifying",
        string trackName = "Silverstone",
        int? driverUserId = null,
        int laps = 10,
        string notes = "seed")
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var s = new CarSession
        {
            TeamCarId = teamCarId,
            SessionType = sessionType,
            Date = DateOnly.FromDateTime(DateTime.UtcNow),
            TrackName = trackName,
            DriverUserId = driverUserId,
            Laps = laps,
            Notes = notes
        };

        db.CarSessions.Add(s);
        await db.SaveChangesAsync();
        return s.Id;
    }

    [Fact]
    public async Task GetAll_returns_200_for_authenticated_user()
    {
        var client = _factory.CreateClient().AsUser(userId: 1, roles: "Driver");

        var res = await client.GetAsync("/api/car-sessions");

        res.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetAll_with_teamCarId_filters_results()
    {
        var carA = await SeedCarAsync();
        var carB = await SeedCarAsync();

        await SeedSessionAsync(carA, trackName: "A Track");
        await SeedSessionAsync(carB, trackName: "B Track");

        var client = _factory.CreateClient().AsUser(userId: 1, roles: "Driver");

        var list = await client.GetFromJsonAsync<List<CarSessionRead>>($"/api/car-sessions?teamCarId={carA}");

        list.Should().NotBeNull();
        list!.All(x => x.TeamCarId == carA).Should().BeTrue();
        list.Should().HaveCount(1);
    }

    [Fact]
    public async Task GetById_returns_404_when_missing()
    {
        var client = _factory.CreateClient().AsUser(userId: 1, roles: "Driver");

        var res = await client.GetAsync("/api/car-sessions/999999");

        res.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetById_returns_200_and_expected_shape_when_exists()
    {
        var carId = await SeedCarAsync();
        var sessionId = await SeedSessionAsync(carId, sessionType: "Practice", trackName: "Monza", laps: 7, notes: "hello");

        var client = _factory.CreateClient().AsUser(userId: 1, roles: "Driver");

        var res = await client.GetAsync($"/api/car-sessions/{sessionId}");
        res.StatusCode.Should().Be(HttpStatusCode.OK);

        var dto = await res.Content.ReadFromJsonAsync<CarSessionRead>();
        dto.Should().NotBeNull();
        dto!.Id.Should().Be(sessionId);
        dto.TeamCarId.Should().Be(carId);
        dto.TrackName.Should().Be("Monza");
        dto.Laps.Should().Be(7);
        dto.Notes.Should().Be("hello");
    }

    [Fact]
    public async Task Create_requires_authentication()
    {
        var carId = await SeedCarAsync();
        var client = _factory.CreateClient().AsAnonymous();

        var res = await client.PostAsJsonAsync("/api/car-sessions", new
        {
            teamCarId = carId,
            sessionType = "Practice",
            date = DateOnly.FromDateTime(DateTime.UtcNow),
            trackName = "Spa",
            driverUserId = (int?)null,
            laps = 5,
            notes = ""
        });

        res.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Create_requires_role()
    {
        var carId = await SeedCarAsync();
        var client = _factory.CreateClient().AsUser(userId: 1, roles: "PartsClerk");

        var res = await client.PostAsJsonAsync("/api/car-sessions", new
        {
            teamCarId = carId,
            sessionType = "Practice",
            date = DateOnly.FromDateTime(DateTime.UtcNow),
            trackName = "Spa",
            driverUserId = (int?)null,
            laps = 5,
            notes = ""
        });

        res.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task Create_invalid_teamCarId_returns_400(int badCarId)
    {
        var client = _factory.CreateClient().AsUser(userId: 1, roles: "Driver");

        var res = await client.PostAsJsonAsync("/api/car-sessions", new
        {
            teamCarId = badCarId,
            sessionType = "Practice",
            date = DateOnly.FromDateTime(DateTime.UtcNow),
            trackName = "Spa",
            driverUserId = (int?)null,
            laps = 0,
            notes = ""
        });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Create_requires_existing_teamCar()
    {
        var client = _factory.CreateClient().AsUser(userId: 1, roles: "Driver");

        var res = await client.PostAsJsonAsync("/api/car-sessions", new
        {
            teamCarId = 999999,
            sessionType = "Practice",
            date = DateOnly.FromDateTime(DateTime.UtcNow),
            trackName = "Spa",
            driverUserId = (int?)null,
            laps = 0,
            notes = ""
        });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Create_missing_trackName_returns_400()
    {
        var carId = await SeedCarAsync();
        var client = _factory.CreateClient().AsUser(userId: 1, roles: "Driver");

        var res = await client.PostAsJsonAsync("/api/car-sessions", new
        {
            teamCarId = carId,
            sessionType = "Practice",
            date = DateOnly.FromDateTime(DateTime.UtcNow),
            trackName = "",
            driverUserId = (int?)null,
            laps = 0,
            notes = ""
        });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Create_negative_laps_returns_400()
    {
        var carId = await SeedCarAsync();
        var client = _factory.CreateClient().AsUser(userId: 1, roles: "Driver");

        var res = await client.PostAsJsonAsync("/api/car-sessions", new
        {
            teamCarId = carId,
            sessionType = "Practice",
            date = DateOnly.FromDateTime(DateTime.UtcNow),
            trackName = "Spa",
            driverUserId = (int?)null,
            laps = -1,
            notes = ""
        });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Create_driverUserId_must_exist_if_provided()
    {
        var carId = await SeedCarAsync();
        var client = _factory.CreateClient().AsUser(userId: 1, roles: "Driver");

        var res = await client.PostAsJsonAsync("/api/car-sessions", new
        {
            teamCarId = carId,
            sessionType = "Practice",
            date = DateOnly.FromDateTime(DateTime.UtcNow),
            trackName = "Spa",
            driverUserId = 999999,
            laps = 0,
            notes = ""
        });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Create_valid_returns_201_and_defaults_sessionType_when_blank()
    {
        var carId = await SeedCarAsync();
        var driverId = await SeedUserAsync();

        var client = _factory.CreateClient().AsUser(userId: driverId, roles: "Driver");

        var res = await client.PostAsJsonAsync("/api/car-sessions", new
        {
            teamCarId = carId,
            sessionType = "",
            date = DateOnly.FromDateTime(DateTime.UtcNow),
            trackName = "Spa",
            driverUserId = (int?)null,
            laps = 0,
            notes = "x"
        });

        res.StatusCode.Should().Be(HttpStatusCode.Created);

        var created = await res.Content.ReadFromJsonAsync<CarSessionRead>();
        created.Should().NotBeNull();
        created!.TeamCarId.Should().Be(carId);
        created.TrackName.Should().Be("Spa");
        created.SessionType.Should().Be("Practice");
    }

    [Fact]
    public async Task Update_requires_authentication()
    {
        var client = _factory.CreateClient().AsAnonymous();

        var res = await client.PutAsJsonAsync("/api/car-sessions/1", new
        {
            teamCarId = 1,
            sessionType = "Practice",
            date = DateOnly.FromDateTime(DateTime.UtcNow),
            trackName = "Spa",
            driverUserId = (int?)null,
            laps = 0,
            notes = ""
        });

        res.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Update_requires_role()
    {
        var carId = await SeedCarAsync();
        var client = _factory.CreateClient().AsUser(userId: 1, roles: "PartsClerk");

        var res = await client.PutAsJsonAsync("/api/car-sessions/1", new
        {
            teamCarId = carId,
            sessionType = "Practice",
            date = DateOnly.FromDateTime(DateTime.UtcNow),
            trackName = "Spa",
            driverUserId = (int?)null,
            laps = 0,
            notes = ""
        });

        res.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Update_returns_404_when_missing_and_payload_is_valid()
    {
        var carId = await SeedCarAsync();
        var client = _factory.CreateClient().AsUser(userId: 1, roles: "Driver");

        var res = await client.PutAsJsonAsync("/api/car-sessions/999999", new
        {
            teamCarId = carId,
            sessionType = "Practice",
            date = DateOnly.FromDateTime(DateTime.UtcNow),
            trackName = "Spa",
            driverUserId = (int?)null,
            laps = 0,
            notes = ""
        });
        
        res.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Update_blank_sessionType_keeps_existing()
    {
        var carId = await SeedCarAsync();
        var sessionId = await SeedSessionAsync(carId, sessionType: "Qualifying", trackName: "Monza");

        var client = _factory.CreateClient().AsUser(userId: 1, roles: "Driver");

        var res = await client.PutAsJsonAsync($"/api/car-sessions/{sessionId}", new
        {
            teamCarId = carId,
            sessionType = "",
            date = DateOnly.FromDateTime(DateTime.UtcNow),
            trackName = "Monza",
            driverUserId = (int?)null,
            laps = 11,
            notes = "updated"
        });

        res.StatusCode.Should().Be(HttpStatusCode.NoContent);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var updated = await db.CarSessions.FindAsync(sessionId);

        updated.Should().NotBeNull();
        updated!.SessionType.Should().Be("Qualifying");
        updated.Laps.Should().Be(11);
        updated.Notes.Should().Be("updated");
    }

    [Fact]
    public async Task Update_valid_returns_204_and_persists_changes()
    {
        var carIdA = await SeedCarAsync();
        var carIdB = await SeedCarAsync();

        var userId = await SeedUserAsync();
        var sessionId = await SeedSessionAsync(carIdA, sessionType: "Practice", trackName: "Spa", laps: 5);

        var client = _factory.CreateClient().AsUser(userId: userId, roles: "Driver");

        var res = await client.PutAsJsonAsync($"/api/car-sessions/{sessionId}", new
        {
            teamCarId = carIdB,
            sessionType = "Race",
            date = DateOnly.FromDateTime(DateTime.UtcNow),
            trackName = "Silverstone",
            driverUserId = (int?)null,
            laps = 12,
            notes = "changed"
        });

        res.StatusCode.Should().Be(HttpStatusCode.NoContent);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var updated = await db.CarSessions.FindAsync(sessionId);

        updated.Should().NotBeNull();
        updated!.TeamCarId.Should().Be(carIdB);
        updated.SessionType.Should().Be("Race");
        updated.TrackName.Should().Be("Silverstone");
        updated.Laps.Should().Be(12);
        updated.Notes.Should().Be("changed");
    }

    [Fact]
    public async Task Delete_requires_authentication()
    {
        var client = _factory.CreateClient().AsAnonymous();

        var res = await client.DeleteAsync("/api/car-sessions/1");

        res.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Delete_requires_role()
    {
        var client = _factory.CreateClient().AsUser(userId: 1, roles: "PartsClerk");

        var res = await client.DeleteAsync("/api/car-sessions/1");

        res.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Delete_returns_404_when_missing()
    {
        var client = _factory.CreateClient().AsUser(userId: 1, roles: "Driver");

        var res = await client.DeleteAsync("/api/car-sessions/999999");

        res.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Delete_valid_returns_204_and_removes_row()
    {
        var carId = await SeedCarAsync();
        var sessionId = await SeedSessionAsync(carId);

        var client = _factory.CreateClient().AsUser(userId: 1, roles: "Driver");

        var res = await client.DeleteAsync($"/api/car-sessions/{sessionId}");
        res.StatusCode.Should().Be(HttpStatusCode.NoContent);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var exists = await db.CarSessions.AnyAsync(x => x.Id == sessionId);
        exists.Should().BeFalse();
    }
}