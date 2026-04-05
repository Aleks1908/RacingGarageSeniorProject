using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RacingGarage.Data;
using RacingGarage.dto;
using RacingGarage.Models;
using Xunit;

namespace RacingGarage.Tests.InventoryStock;

public class InventoryStockApiTests : IClassFixture<TestAppFactory>
{
    private readonly TestAppFactory _factory;

    public InventoryStockApiTests(TestAppFactory factory)
    {
        _factory = factory;
    }

    private async Task<int> SeedUserAsync(string name = "Parts Clerk User")
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var u = new AppUser
        {
            Name = name,
            Email = $"{Guid.NewGuid():N}@test.local",
            PasswordHash = "hash",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        db.Users.Add(u);
        await db.SaveChangesAsync();
        return u.Id;
    }

    private async Task<int> SeedSupplierAsync(string? name = null)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var supplierName = name ?? $"Stock Supplier {Guid.NewGuid():N}";

        var s = new Supplier
        {
            Name = supplierName,
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

    private async Task<int> SeedPartAsync(bool active = true, string? sku = null)
    {
        var supplierId = await SeedSupplierAsync();

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var p = new Part
        {
            Name = "Brake Pad",
            Sku = (sku ?? Guid.NewGuid().ToString("N")[..10]).ToUpperInvariant(),
            Category = "Brakes",
            UnitCost = 10m,
            ReorderPoint = 1,
            SupplierId = supplierId,
            IsActive = active,
            CreatedAt = DateTime.UtcNow
        };

        db.Parts.Add(p);
        await db.SaveChangesAsync();
        return p.Id;
    }

    private async Task<int> SeedLocationAsync(bool active = true, string? code = null)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var loc = new InventoryLocation
        {
            Name = "Main Garage",
            Code = (code ?? Guid.NewGuid().ToString("N")[..6]).ToUpperInvariant(),
            Description = "",
            IsActive = active,
            CreatedAt = DateTime.UtcNow
        };

        db.InventoryLocations.Add(loc);
        await db.SaveChangesAsync();
        return loc.Id;
    }

    [Fact]
    public async Task GetAll_returns_200_for_authenticated_user()
    {
        var client = _factory.CreateClient().AsUser(userId: 1, roles: "Driver");

        var res = await client.GetAsync("/api/inventory-stock");

        res.StatusCode.Should().Be(HttpStatusCode.OK);
    }


    [Fact]
    public async Task Adjust_requires_auth()
    {
        var res = await _factory.CreateClient().AsAnonymous()
            .PostAsJsonAsync("/api/inventory-stock/adjust", new { });

        res.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Adjust_requires_role()
    {
        var client = _factory.CreateClient().AsUser(userId: 1, roles: "Driver");

        var res = await client.PostAsJsonAsync("/api/inventory-stock/adjust", new
        {
            partId = 1,
            inventoryLocationId = 1,
            quantityChange = 1
        });

        res.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Adjust_rejects_zero_quantity()
    {
        var client = _factory.CreateClient().AsUser(userId: 1, roles: "PartsClerk");

        var res = await client.PostAsJsonAsync("/api/inventory-stock/adjust", new
        {
            partId = 1,
            inventoryLocationId = 1,
            quantityChange = 0
        });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Adjust_rejects_inactive_part()
    {
        var partId = await SeedPartAsync(active: false);
        var locId = await SeedLocationAsync(active: true);
        var userId = await SeedUserAsync();

        var client = _factory.CreateClient().AsUser(userId: userId, roles: "PartsClerk");

        var res = await client.PostAsJsonAsync("/api/inventory-stock/adjust", new
        {
            partId,
            inventoryLocationId = locId,
            quantityChange = 1
        });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Adjust_rejects_inactive_location()
    {
        var partId = await SeedPartAsync(active: true);
        var locId = await SeedLocationAsync(active: false);
        var userId = await SeedUserAsync();

        var client = _factory.CreateClient().AsUser(userId: userId, roles: "PartsClerk");

        var res = await client.PostAsJsonAsync("/api/inventory-stock/adjust", new
        {
            partId,
            inventoryLocationId = locId,
            quantityChange = 1
        });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Adjust_creates_new_stock_row_when_missing()
    {
        var userId = await SeedUserAsync();
        var partId = await SeedPartAsync(active: true);
        var locId = await SeedLocationAsync(active: true);

        var client = _factory.CreateClient().AsUser(userId: userId, roles: "PartsClerk");

        var res = await client.PostAsJsonAsync("/api/inventory-stock/adjust", new
        {
            partId,
            inventoryLocationId = locId,
            quantityChange = 5,
            reason = "Receive"
        });

        res.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await res.Content.ReadFromJsonAsync<InventoryStockReadDto>();
        body.Should().NotBeNull();
        body!.Quantity.Should().Be(5);
        body.PartId.Should().Be(partId);
        body.InventoryLocationId.Should().Be(locId);
    }

    [Fact]
    public async Task Adjust_increments_existing_stock()
    {
        var userId = await SeedUserAsync();
        var partId = await SeedPartAsync(active: true);
        var locId = await SeedLocationAsync(active: true);

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.InventoryStock.Add(new RacingGarage.Models.InventoryStock
            {
                PartId = partId,
                InventoryLocationId = locId,
                Quantity = 3,
                UpdatedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }

        var client = _factory.CreateClient().AsUser(userId: userId, roles: "PartsClerk");

        var res = await client.PostAsJsonAsync("/api/inventory-stock/adjust", new
        {
            partId,
            inventoryLocationId = locId,
            quantityChange = 2
        });

        res.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await res.Content.ReadFromJsonAsync<InventoryStockReadDto>();
        body.Should().NotBeNull();
        body!.Quantity.Should().Be(5);
    }

    [Fact]
    public async Task Adjust_rejects_negative_below_zero()
    {
        var userId = await SeedUserAsync();
        var partId = await SeedPartAsync(active: true);
        var locId = await SeedLocationAsync(active: true);

        var client = _factory.CreateClient().AsUser(userId: userId, roles: "PartsClerk");

        var res = await client.PostAsJsonAsync("/api/inventory-stock/adjust", new
        {
            partId,
            inventoryLocationId = locId,
            quantityChange = -1
        });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Adjust_creates_inventory_movement()
    {
        var userId = await SeedUserAsync();
        var partId = await SeedPartAsync(active: true);
        var locId = await SeedLocationAsync(active: true);

        var client = _factory.CreateClient().AsUser(userId: userId, roles: "PartsClerk");

        var res = await client.PostAsJsonAsync("/api/inventory-stock/adjust", new
        {
            partId,
            inventoryLocationId = locId,
            quantityChange = 4,
            reason = "Audit",
            notes = "Test note"
        });

        res.StatusCode.Should().Be(HttpStatusCode.OK);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var movement = await db.InventoryMovements
            .AsNoTracking()
            .OrderByDescending(m => m.Id)
            .FirstOrDefaultAsync();

        movement.Should().NotBeNull();
        movement!.PartId.Should().Be(partId);
        movement.InventoryLocationId.Should().Be(locId);
        movement.QuantityChange.Should().Be(4);
        movement.Reason.Should().Be("Audit");
        movement.Notes.Should().Be("Test note");
        movement.PerformedByUserId.Should().Be(userId);
    }
}