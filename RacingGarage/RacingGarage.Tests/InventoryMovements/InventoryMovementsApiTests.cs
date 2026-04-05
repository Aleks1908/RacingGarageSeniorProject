using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using RacingGarage.Data;
using RacingGarage.Models;
using Xunit;

namespace RacingGarage.Tests.InventoryMovements;

public class InventoryMovementsApiTests : IClassFixture<TestAppFactory>
{
    private readonly TestAppFactory _factory;
    private static int _seq = 1000;

    public InventoryMovementsApiTests(TestAppFactory factory) => _factory = factory;

    private sealed class InventoryMovementRead
    {
        public int Id { get; set; }
        public int PartId { get; set; }
        public string? PartSku { get; set; }
        public string? PartName { get; set; }

        public int InventoryLocationId { get; set; }
        public string? LocationCode { get; set; }

        public int QuantityChange { get; set; }
        public string? Reason { get; set; }

        public int? WorkOrderId { get; set; }

        public int? PerformedByUserId { get; set; }
        public string? PerformedByName { get; set; }

        public DateTime PerformedAt { get; set; }
        public string? Notes { get; set; }
    }

    private async Task<int> SeedUserAsync(string? name = null, string? email = null)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var u = new AppUser
        {
            Name = name ?? $"User {_seq}",
            Email = email ?? $"u{Interlocked.Increment(ref _seq)}@test.local",
            PasswordHash = "x"
        };

        db.Users.Add(u);
        await db.SaveChangesAsync();
        return u.Id;
    }

    private async Task<int> SeedSupplierAsync(string? name = null)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var s = new Supplier
        {
            Name = name ?? $"Supplier {Guid.NewGuid():N}",
            ContactEmail = "",
            Phone = "",
            AddressLine1 = "",
            AddressLine2 = "",
            City = "",
            Country = "",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        db.Suppliers.Add(s);
        await db.SaveChangesAsync();
        return s.Id;
    }

    private async Task<int> SeedPartAsync(string? sku = null, string? name = null, int? supplierId = null)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var supId = supplierId ?? await SeedSupplierAsync();

        var p = new Part
        {
            Name = name ?? $"Part {Guid.NewGuid():N}",
            Sku = (sku ?? $"SKU-{Interlocked.Increment(ref _seq)}").Trim().ToUpperInvariant(),
            Category = "Test",
            UnitCost = 1m,
            ReorderPoint = 0,
            SupplierId = supId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        db.Parts.Add(p);
        await db.SaveChangesAsync();
        return p.Id;
    }

    private async Task<int> SeedLocationAsync(string? code = null, string? name = null)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var loc = new InventoryLocation
        {
            Name = name ?? $"Loc {Guid.NewGuid():N}",
            Code = (code ?? $"L{Interlocked.Increment(ref _seq)}").Trim().ToUpperInvariant(),
            Description = "",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        db.InventoryLocations.Add(loc);
        await db.SaveChangesAsync();
        return loc.Id;
    }

    private async Task<int> SeedWorkOrderAsync(string? title = null)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var createdByUserId = await SeedUserAsync(name: "WO Creator");
        var teamCarId = await SeedTeamCarAsync(carNumber: $"TC-{Interlocked.Increment(ref _seq)}");

        var wo = new WorkOrder
        {
            Title = title ?? $"WO {Guid.NewGuid():N}",
            Status = "Open",

            TeamCarId = teamCarId,
            CreatedByUserId = createdByUserId,

            CreatedAt = DateTime.UtcNow,
        };

        db.WorkOrders.Add(wo);
        await db.SaveChangesAsync();
        return wo.Id;
    }

    private async Task<int> SeedTeamCarAsync(string? carNumber = null)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var tc = new TeamCar
        {
            CarNumber = carNumber ?? $"CAR-{Interlocked.Increment(ref _seq)}",
            Make = "Test",
            Model = "Test",
            CreatedAt = DateTime.UtcNow
        };

        db.TeamCars.Add(tc);
        await db.SaveChangesAsync();
        return tc.Id;
    }

    private async Task<int> SeedMovementAsync(
        int partId,
        int locationId,
        int quantityChange,
        string reason,
        DateTime performedAtUtc,
        int? performedByUserId = null,
        int? workOrderId = null,
        string? notes = null)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var m = new InventoryMovement
        {
            PartId = partId,
            InventoryLocationId = locationId,
            QuantityChange = quantityChange,
            Reason = reason,
            WorkOrderId = workOrderId,
            PerformedByUserId = performedByUserId,
            PerformedAt = performedAtUtc,
            Notes = notes ?? ""
        };

        db.InventoryMovements.Add(m);
        await db.SaveChangesAsync();
        return m.Id;
    }

    [Fact]
    public async Task GetAll_returns_200_for_authenticated_user()
    {
        var client = _factory.CreateClient().AsUser(userId: 1, roles: "Driver");

        var res = await client.GetAsync("/api/inventory-movements");

        res.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetAll_without_filters_returns_all_and_orders_by_performedAt_then_id_desc()
    {
        var partA = await SeedPartAsync(sku: "PART-A");
        var locA = await SeedLocationAsync(code: "LOC-A");
        var userId = await SeedUserAsync(name: "Alice");

        var t2 = DateTime.UtcNow.AddMinutes(-1);
        var t1 = DateTime.UtcNow.AddMinutes(-10);

        var idOld = await SeedMovementAsync(partA, locA, +5, "Receive", t1, performedByUserId: userId);
        var idNew1 = await SeedMovementAsync(partA, locA, -1, "Adjustment", t2, performedByUserId: userId);
        var idNew2 = await SeedMovementAsync(partA, locA, -2, "Adjustment", t2, performedByUserId: userId);

        var client = _factory.CreateClient().AsUser(userId: 1, roles: "Driver");
        var list = await client.GetFromJsonAsync<List<InventoryMovementRead>>("/api/inventory-movements");

        list.Should().NotBeNull();
        list!.Count.Should().BeGreaterThanOrEqualTo(3);

        var ours = list.Where(x => x.Id == idOld || x.Id == idNew1 || x.Id == idNew2).ToList();
        ours.Should().HaveCount(3);

        ours[0].PerformedAt.Should().BeCloseTo(t2, precision: TimeSpan.FromSeconds(2));
        ours[1].PerformedAt.Should().BeCloseTo(t2, precision: TimeSpan.FromSeconds(2));
        ours[2].PerformedAt.Should().BeCloseTo(t1, precision: TimeSpan.FromSeconds(2));

        ours[0].Id.Should().Be(Math.Max(idNew1, idNew2));
        ours[1].Id.Should().Be(Math.Min(idNew1, idNew2));

        ours[0].PartSku.Should().NotBeNullOrWhiteSpace();
        ours[0].PartName.Should().NotBeNullOrWhiteSpace();
        ours[0].LocationCode.Should().NotBeNullOrWhiteSpace();
        ours[0].PerformedByName.Should().Be("Alice");
    }

    [Fact]
    public async Task GetAll_filters_by_partId()
    {
        var partA = await SeedPartAsync(sku: "PA");
        var partB = await SeedPartAsync(sku: "PB");
        var loc = await SeedLocationAsync(code: "L1");

        var t = DateTime.UtcNow;
        await SeedMovementAsync(partA, loc, +1, "Receive", t);
        await SeedMovementAsync(partB, loc, +1, "Receive", t);

        var client = _factory.CreateClient().AsUser(userId: 1, roles: "Driver");

        var list = await client.GetFromJsonAsync<List<InventoryMovementRead>>($"/api/inventory-movements?partId={partA}");

        list.Should().NotBeNull();
        list!.Should().OnlyContain(x => x.PartId == partA);
    }

    [Fact]
    public async Task GetAll_filters_by_locationId()
    {
        var part = await SeedPartAsync(sku: "P1");
        var locA = await SeedLocationAsync(code: "LA");
        var locB = await SeedLocationAsync(code: "LB");

        var t = DateTime.UtcNow;
        await SeedMovementAsync(part, locA, +1, "Receive", t);
        await SeedMovementAsync(part, locB, +1, "Receive", t);

        var client = _factory.CreateClient().AsUser(userId: 1, roles: "Driver");

        var list = await client.GetFromJsonAsync<List<InventoryMovementRead>>($"/api/inventory-movements?locationId={locB}");

        list.Should().NotBeNull();
        list!.Should().OnlyContain(x => x.InventoryLocationId == locB);
    }

    [Fact]
    public async Task GetAll_filters_by_workOrderId()
    {
        var part = await SeedPartAsync(sku: "PWO");
        var loc = await SeedLocationAsync(code: "LWO");
        var wo1 = await SeedWorkOrderAsync("WO-1");
        var wo2 = await SeedWorkOrderAsync("WO-2");

        var t = DateTime.UtcNow;
        await SeedMovementAsync(part, loc, -1, "Consume", t, workOrderId: wo1);
        await SeedMovementAsync(part, loc, -2, "Consume", t, workOrderId: wo2);

        var client = _factory.CreateClient().AsUser(userId: 1, roles: "Driver");

        var list = await client.GetFromJsonAsync<List<InventoryMovementRead>>($"/api/inventory-movements?workOrderId={wo1}");

        list.Should().NotBeNull();
        list!.Should().OnlyContain(x => x.WorkOrderId == wo1);
    }

    [Fact]
    public async Task GetAll_filters_by_reason_and_trims()
    {
        var part = await SeedPartAsync(sku: "PR");
        var loc = await SeedLocationAsync(code: "LR");

        var t = DateTime.UtcNow;
        await SeedMovementAsync(part, loc, +1, "Receive", t);
        await SeedMovementAsync(part, loc, +1, "Adjustment", t);

        var client = _factory.CreateClient().AsUser(userId: 1, roles: "Driver");

        var list = await client.GetFromJsonAsync<List<InventoryMovementRead>>("/api/inventory-movements?reason=%20Receive%20");

        list.Should().NotBeNull();
        list!.Should().OnlyContain(x => x.Reason == "Receive");
    }

    [Fact]
    public async Task GetAll_combines_filters_part_location_reason()
    {
        var partA = await SeedPartAsync(sku: "CMB-A");
        var partB = await SeedPartAsync(sku: "CMB-B");
        var locA = await SeedLocationAsync(code: "CMB-LA");
        var locB = await SeedLocationAsync(code: "CMB-LB");

        var t = DateTime.UtcNow;
        await SeedMovementAsync(partA, locB, +5, "Receive", t);
        await SeedMovementAsync(partA, locB, +1, "Adjustment", t);
        await SeedMovementAsync(partA, locA, +5, "Receive", t);
        await SeedMovementAsync(partB, locB, +5, "Receive", t);

        var client = _factory.CreateClient().AsUser(userId: 1, roles: "Driver");

        var url = $"/api/inventory-movements?partId={partA}&locationId={locB}&reason=Receive";
        var list = await client.GetFromJsonAsync<List<InventoryMovementRead>>(url);

        list.Should().NotBeNull();
        list!.Should().HaveCount(1);
        list[0].PartId.Should().Be(partA);
        list[0].InventoryLocationId.Should().Be(locB);
        list[0].Reason.Should().Be("Receive");
    }
}