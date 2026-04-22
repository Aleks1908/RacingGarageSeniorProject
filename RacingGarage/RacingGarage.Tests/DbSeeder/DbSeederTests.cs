using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RacingGarage.Data;
using RacingGarage.Models;
using Xunit;

namespace RacingGarage.Tests.Data;

public class DbSeederTests : IClassFixture<TestAppFactory>
{
    private readonly TestAppFactory _factory;

    public DbSeederTests(TestAppFactory factory) => _factory = factory;

    private async Task<AppDbContext> NewDbAsync()
    {
        var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        await db.Database.EnsureDeletedAsync();
        await db.Database.EnsureCreatedAsync();

        return db;
    }

    [Fact]
    public async Task SeedRolesAsync_inserts_4_roles_when_empty()
    {
        await using var db = await NewDbAsync();

        await DbSeeder.SeedRolesAsync(db);

        var roles = await db.Roles.AsNoTracking().OrderBy(r => r.Name).ToListAsync();
        roles.Select(r => r.Name).Should().BeEquivalentTo(new[] { "Driver", "Manager", "Mechanic", "PartsClerk" });
    }

    [Fact]
    public async Task SeedRolesAsync_is_idempotent()
    {
        await using var db = await NewDbAsync();

        await DbSeeder.SeedRolesAsync(db);
        var count1 = await db.Roles.CountAsync();

        await DbSeeder.SeedRolesAsync(db);
        var count2 = await db.Roles.CountAsync();

        count1.Should().Be(4);
        count2.Should().Be(4);
    }

    [Fact]
    public async Task SeedTestUsersAsync_inserts_4_users_and_assigns_roles()
    {
        await using var db = await NewDbAsync();

        await DbSeeder.SeedTestUsersAsync(db);

        var users = await db.Users.AsNoTracking().OrderBy(u => u.Email).ToListAsync();
        users.Should().HaveCount(4);

        users.Select(u => u.Email).Should().BeEquivalentTo(new[]
        {
            "driver@test.com",
            "manager@test.com",
            "mechanic@test.com",
            "parts@test.com"
        });

        users.All(u => !string.IsNullOrWhiteSpace(u.PasswordHash)).Should().BeTrue();
        users.Single(u => u.Email == "manager@test.com").PasswordHash.Should().NotBe("Manager123!");
        users.Single(u => u.Email == "mechanic@test.com").PasswordHash.Should().NotBe("Mechanic123!");
        users.Single(u => u.Email == "driver@test.com").PasswordHash.Should().NotBe("Driver123!");
        users.Single(u => u.Email == "parts@test.com").PasswordHash.Should().NotBe("Parts123!");

        var roleLookup = await db.Roles.AsNoTracking().ToDictionaryAsync(r => r.Id, r => r.Name);

        var mappings = await db.UserRoles.AsNoTracking().ToListAsync();
        mappings.Should().HaveCount(4);

        var byEmail = users.ToDictionary(u => u.Email, u => u.Id);

        roleLookup[mappings.Single(m => m.UserId == byEmail["manager@test.com"]).RoleId].Should().Be("Manager");
        roleLookup[mappings.Single(m => m.UserId == byEmail["mechanic@test.com"]).RoleId].Should().Be("Mechanic");
        roleLookup[mappings.Single(m => m.UserId == byEmail["driver@test.com"]).RoleId].Should().Be("Driver");
        roleLookup[mappings.Single(m => m.UserId == byEmail["parts@test.com"]).RoleId].Should().Be("PartsClerk");
    }

    [Fact]
    public async Task SeedTestUsersAsync_is_idempotent()
    {
        await using var db = await NewDbAsync();

        await DbSeeder.SeedTestUsersAsync(db);
        var users1 = await db.Users.CountAsync();
        var ur1 = await db.UserRoles.CountAsync();

        await DbSeeder.SeedTestUsersAsync(db);
        var users2 = await db.Users.CountAsync();
        var ur2 = await db.UserRoles.CountAsync();

        users1.Should().Be(4);
        ur1.Should().Be(4);
        users2.Should().Be(4);
        ur2.Should().Be(4);
    }

    [Fact]
    public async Task SeedDemoDataAsync_seeds_expected_core_rows_when_database_is_empty()
    {
        await using var db = await NewDbAsync();

        await DbSeeder.SeedTestUsersAsync(db);
        await DbSeeder.SeedDemoDataAsync(db);

        (await db.Suppliers.CountAsync()).Should().BeGreaterThan(0);
        (await db.InventoryLocations.CountAsync()).Should().BeGreaterThan(0);
        (await db.Parts.CountAsync()).Should().BeGreaterThan(0);
        (await db.TeamCars.CountAsync()).Should().BeGreaterThan(0);
        (await db.CarSessions.CountAsync()).Should().BeGreaterThan(0);
        (await db.IssueReports.CountAsync()).Should().BeGreaterThan(0);
        (await db.WorkOrders.CountAsync()).Should().BeGreaterThan(0);
        (await db.WorkOrderTasks.CountAsync()).Should().BeGreaterThan(0);
        (await db.LaborLogs.CountAsync()).Should().BeGreaterThan(0);
        (await db.InventoryStock.CountAsync()).Should().BeGreaterThan(0);
        (await db.InventoryMovements.CountAsync()).Should().BeGreaterThan(0);
        (await db.PartInstallations.CountAsync()).Should().BeGreaterThan(0);

        var supplier = await db.Suppliers.AsNoTracking().SingleAsync(s => s.Name == "Brembo Motorsport");
        supplier.IsActive.Should().BeTrue();

        var mainGarage = await db.InventoryLocations.AsNoTracking().SingleAsync(l => l.Code == "GARAGE-1");
        mainGarage.IsActive.Should().BeTrue();

        var trackBox = await db.InventoryLocations.AsNoTracking().SingleAsync(l => l.Code == "TRACK-BOX");
        trackBox.IsActive.Should().BeTrue();

        var car1 = await db.TeamCars.AsNoTracking().SingleAsync(c => c.CarNumber == "27");
        var wo1 = await db.WorkOrders.AsNoTracking().SingleAsync(w => w.TeamCarId == car1.Id && w.Title == "Brake system inspection and overhaul");

        var issue1 = await db.IssueReports.AsNoTracking().SingleAsync(i => i.TeamCarId == car1.Id && i.Title == "Brake pedal feels soft");
        issue1.LinkedWorkOrderId.Should().Be(wo1.Id);
        issue1.Status.Should().Be("Linked");

        var pad = await db.Parts.AsNoTracking().SingleAsync(p => p.Sku == "BRK-PAD-FRONT-001");
        var padStock = await db.InventoryStock.AsNoTracking().SingleAsync(s => s.PartId == pad.Id && s.InventoryLocationId == mainGarage.Id);
        padStock.Quantity.Should().Be(4);
    }

    [Fact]
    public async Task SeedDemoDataAsync_is_guarded_and_does_not_duplicate_when_any_target_table_has_rows()
    {
        await using var db = await NewDbAsync();

        await DbSeeder.SeedTestUsersAsync(db);
        await DbSeeder.SeedDemoDataAsync(db);

        var counts1 = await SnapshotCountsAsync(db);

        await DbSeeder.SeedDemoDataAsync(db);

        var counts2 = await SnapshotCountsAsync(db);

        counts2.Should().BeEquivalentTo(counts1);
    }

    private static async Task<object> SnapshotCountsAsync(AppDbContext db)
    {
        return new
        {
            Suppliers = await db.Suppliers.CountAsync(),
            Locations = await db.InventoryLocations.CountAsync(),
            Parts = await db.Parts.CountAsync(),
            Cars = await db.TeamCars.CountAsync(),
            Sessions = await db.CarSessions.CountAsync(),
            Issues = await db.IssueReports.CountAsync(),
            WorkOrders = await db.WorkOrders.CountAsync(),
            Tasks = await db.WorkOrderTasks.CountAsync(),
            Labor = await db.LaborLogs.CountAsync(),
            Stock = await db.InventoryStock.CountAsync(),
            Movements = await db.InventoryMovements.CountAsync(),
            Installs = await db.PartInstallations.CountAsync()
        };
    }
}