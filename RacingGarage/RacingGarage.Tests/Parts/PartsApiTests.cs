using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RacingGarage.Data;
using RacingGarage.Models;
using Xunit;

namespace RacingGarage.Tests.Parts;

public class PartsApiTests : IClassFixture<TestAppFactory>
{
    private readonly TestAppFactory _factory;

    public PartsApiTests(TestAppFactory factory) => _factory = factory;

    private static string U(string prefix) => $"{prefix}-{Guid.NewGuid():N}".ToUpperInvariant();

    private async Task<AppDbContext> GetDbAsync()
    {
        var scope = _factory.Services.CreateScope();
        return scope.ServiceProvider.GetRequiredService<AppDbContext>();
    }

    private async Task ResetDbAsync()
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        await db.Database.ExecuteSqlRawAsync("DELETE FROM InventoryStock;");
        await db.Database.ExecuteSqlRawAsync("DELETE FROM Parts;");
        await db.Database.ExecuteSqlRawAsync("DELETE FROM InventoryLocations;");
        await db.Database.ExecuteSqlRawAsync("DELETE FROM Suppliers;");
    }

    private async Task<int> SeedSupplierAsync(string? name = null, bool isActive = true)
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var s = new Supplier
        {
            Name = name ?? U("SUPPLIER"),
            ContactEmail = "",
            Phone = "",
            AddressLine1 = "",
            AddressLine2 = "",
            City = "",
            Country = "",
            IsActive = isActive,
            CreatedAt = DateTime.UtcNow
        };

        db.Suppliers.Add(s);
        await db.SaveChangesAsync();
        return s.Id;
    }

    private async Task<int> SeedLocationAsync(string? code = null)
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var loc = new InventoryLocation
        {
            Name = "Test Location",
            Code = code ?? U("LOC"),
            Description = "",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        db.InventoryLocations.Add(loc);
        await db.SaveChangesAsync();
        return loc.Id;
    }

    private async Task<int> SeedPartAsync(
        int supplierId,
        string? name = null,
        string? sku = null,
        string category = "Brakes",
        decimal unitCost = 10m,
        int reorderPoint = 0,
        bool isActive = true)
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var p = new Part
        {
            Name = name ?? "Test Part",
            Sku = (sku ?? U("SKU")).Trim().ToUpperInvariant(),
            Category = category,
            UnitCost = unitCost,
            ReorderPoint = reorderPoint,
            SupplierId = supplierId,
            IsActive = isActive,
            CreatedAt = DateTime.UtcNow
        };

        db.Parts.Add(p);
        await db.SaveChangesAsync();
        return p.Id;
    }

    private async Task SeedStockAsync(int partId, int locationId, int qty)
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        db.InventoryStock.Add(new Models.InventoryStock
        {
            PartId = partId,
            InventoryLocationId = locationId,
            Quantity = qty,
            UpdatedAt = DateTime.UtcNow
        });

        await db.SaveChangesAsync();
    }

    [Fact]
    public async Task GetAll_returns_200_for_any_authenticated_user()
    {
        await ResetDbAsync();

        var client = _factory.CreateClient().AsUser(userId: 1, roles: "Driver");
        var res = await client.GetAsync("/api/parts");

        res.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetAll_needsReorder_true_requires_locationId_even_when_authenticated()
    {
        await ResetDbAsync();

        var client = _factory.CreateClient().AsUser(userId: 1, roles: "Driver");
        var res = await client.GetAsync("/api/parts?needsReorder=true");

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
    

    [Fact]
    public async Task GetAll_with_locationId_includes_stock_and_needsReorder_and_can_filter_needsReorder_true()
    {
        await ResetDbAsync();

        var supplierId = await SeedSupplierAsync("Supplier Stock");
        var locId = await SeedLocationAsync("GARAGE-1");

        var pNeed = await SeedPartAsync(supplierId, name: "Need Reorder", sku: "NEED-001", reorderPoint: 5);
        await SeedStockAsync(pNeed, locId, 2);
        
        var pOk = await SeedPartAsync(supplierId, name: "Ok Stock", sku: "OK-001", reorderPoint: 5);
        await SeedStockAsync(pOk, locId, 6);
        
        await SeedPartAsync(supplierId, name: "No Stock Row", sku: "NOSTOCK-001", reorderPoint: 0);

        var client = _factory.CreateClient().AsUser(userId: 1, roles: "Driver");
        
        var resAll = await client.GetAsync($"/api/parts?locationId={locId}");
        resAll.StatusCode.Should().Be(HttpStatusCode.OK);

        var all = await resAll.Content.ReadFromJsonAsync<List<PartReadLike>>();
        all.Should().NotBeNull();
        all!.Count.Should().Be(3);

        var need = all.Single(x => x.Sku == "NEED-001");
        need.CurrentStock.Should().Be(2);
        need.NeedsReorder.Should().BeTrue();

        var ok = all.Single(x => x.Sku == "OK-001");
        ok.CurrentStock.Should().Be(6);
        ok.NeedsReorder.Should().BeFalse();

        var none = all.Single(x => x.Sku == "NOSTOCK-001");
        none.CurrentStock.Should().Be(0);
        none.NeedsReorder.Should().BeFalse();

        var resNeed = await client.GetAsync($"/api/parts?locationId={locId}&needsReorder=true");
        resNeed.StatusCode.Should().Be(HttpStatusCode.OK);

        var needOnly = await resNeed.Content.ReadFromJsonAsync<List<PartReadLike>>();
        needOnly.Should().NotBeNull();
        needOnly!.Select(x => x.Sku).Should().Equal(new[] { "NEED-001" });
    }

    [Fact]
    public async Task GetAll_without_locationId_aggregates_stock_across_locations_and_sets_needsReorder()
    {
        await ResetDbAsync();

        var supplierId = await SeedSupplierAsync("Supplier Sum");
        var loc1 = await SeedLocationAsync("LOC-1");
        var loc2 = await SeedLocationAsync("LOC-2");

        var p = await SeedPartAsync(supplierId, name: "Summed Part", sku: "SUM-001", reorderPoint: 10);

        await SeedStockAsync(p, loc1, 4);
        await SeedStockAsync(p, loc2, 5);

        var client = _factory.CreateClient().AsUser(userId: 1, roles: "Driver");

        var res = await client.GetAsync("/api/parts");
        res.StatusCode.Should().Be(HttpStatusCode.OK);

        var list = await res.Content.ReadFromJsonAsync<List<PartReadLike>>();
        list.Should().NotBeNull();

        var row = list!.Single(x => x.Sku == "SUM-001");
        row.CurrentStock.Should().Be(9);
        row.NeedsReorder.Should().BeTrue();
    }

    [Fact]
    public async Task GetById_returns_404_when_missing()
    {
        await ResetDbAsync();

        var client = _factory.CreateClient().AsUser(userId: 1, roles: "Driver");

        var res = await client.GetAsync("/api/parts/999999");

        res.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
    
    [Fact]
    public async Task Create_requires_role()
    {
        await ResetDbAsync();

        var supplierId = await SeedSupplierAsync("Supplier Forbidden Create");
        var client = _factory.CreateClient().AsUser(userId: 1, roles: "Driver");

        var res = await client.PostAsJsonAsync("/api/parts", new
        {
            name = "Pad",
            sku = "PAD-FORBIDDEN-001",
            category = "Brakes",
            unitCost = 10.0,
            reorderPoint = 1,
            supplierId
        });

        res.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Theory]
    [InlineData("", "SKU-1", "Brakes", 1.0, 0, "Name is required.")]
    [InlineData("Name", "", "Brakes", 1.0, 0, "Sku is required.")]
    [InlineData("Name", "SKU-1", "", 1.0, 0, "Category is required.")]
    public async Task Create_validates_required_fields(string name, string sku, string category, double unitCost, int reorderPoint, string _)
    {
        await ResetDbAsync();

        var supplierId = await SeedSupplierAsync("Supplier Create Validate");
        var client = _factory.CreateClient().AsUser(userId: 1, roles: "PartsClerk");

        var res = await client.PostAsJsonAsync("/api/parts", new
        {
            name,
            sku,
            category,
            unitCost,
            reorderPoint,
            supplierId
        });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Create_rejects_negative_unitCost_and_reorderPoint()
    {
        await ResetDbAsync();

        var supplierId = await SeedSupplierAsync("Supplier Negatives");
        var client = _factory.CreateClient().AsUser(userId: 1, roles: "PartsClerk");

        var res1 = await client.PostAsJsonAsync("/api/parts", new
        {
            name = "X",
            sku = "NEG-UC",
            category = "Brakes",
            unitCost = -1.0,
            reorderPoint = 0,
            supplierId
        });
        res1.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var res2 = await client.PostAsJsonAsync("/api/parts", new
        {
            name = "X",
            sku = "NEG-RP",
            category = "Brakes",
            unitCost = 1.0,
            reorderPoint = -1,
            supplierId
        });
        res2.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Create_requires_supplierId_and_existing_supplier()
    {
        await ResetDbAsync();

        var client = _factory.CreateClient().AsUser(userId: 1, roles: "PartsClerk");

        var res1 = await client.PostAsJsonAsync("/api/parts", new
        {
            name = "Pad",
            sku = "SUP-REQ-001",
            category = "Brakes",
            unitCost = 10.0,
            reorderPoint = 1,
            supplierId = 0
        });
        res1.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var res2 = await client.PostAsJsonAsync("/api/parts", new
        {
            name = "Pad",
            sku = "SUP-REQ-002",
            category = "Brakes",
            unitCost = 10.0,
            reorderPoint = 1,
            supplierId = 999999
        });
        res2.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Create_duplicate_sku_returns_409()
    {
        await ResetDbAsync();

        var supplierId = await SeedSupplierAsync("Supplier Dup");
        await SeedPartAsync(supplierId, name: "Existing", sku: "DUP-SKU-001");

        var client = _factory.CreateClient().AsUser(userId: 1, roles: "PartsClerk");

        var res = await client.PostAsJsonAsync("/api/parts", new
        {
            name = "New Part",
            sku = "  dup-sku-001  ",
            category = "Brakes",
            unitCost = 2.0,
            reorderPoint = 1,
            supplierId
        });

        res.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Create_valid_can_create_inactive_part()
    {
        await ResetDbAsync();

        var supplierId = await SeedSupplierAsync("Supplier Inactive Part");
        var client = _factory.CreateClient().AsUser(userId: 1, roles: "PartsClerk");

        var res = await client.PostAsJsonAsync("/api/parts", new
        {
            name = "Archived Part",
            sku = "ARCH-001",
            category = "Brakes",
            unitCost = 5.0,
            reorderPoint = 0,
            supplierId,
            isActive = false
        });

        res.StatusCode.Should().Be(HttpStatusCode.Created);

        var created = await res.Content.ReadFromJsonAsync<PartReadLike>();
        created.Should().NotBeNull();
        created!.IsActive.Should().BeFalse();
    }

    [Fact]
    public async Task Update_requires_role()
    {
        await ResetDbAsync();

        var supplierId = await SeedSupplierAsync("Supplier Update Forbidden");
        var partId = await SeedPartAsync(supplierId, name: "Update Me", sku: "UPD-001");

        var client = _factory.CreateClient().AsUser(userId: 1, roles: "Driver");

        var res = await client.PutAsJsonAsync($"/api/parts/{partId}", new
        {
            name = "X",
            sku = "UPD-001",
            category = "Brakes",
            unitCost = 1.0,
            reorderPoint = 0,
            supplierId,
            isActive = true
        });

        res.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Update_returns_404_when_part_missing()
    {
        await ResetDbAsync();

        var supplierId = await SeedSupplierAsync("Supplier Update 404");
        var client = _factory.CreateClient().AsUser(userId: 1, roles: "PartsClerk");

        var res = await client.PutAsJsonAsync("/api/parts/999999", new
        {
            name = "X",
            sku = "UPD-404",
            category = "Brakes",
            unitCost = 1.0,
            reorderPoint = 0,
            supplierId,
            isActive = true
        });

        res.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Update_rejects_conflicting_sku()
    {
        await ResetDbAsync();

        var supplierId = await SeedSupplierAsync("Supplier Update SKU");
        var partA = await SeedPartAsync(supplierId, name: "A", sku: "SKU-A");
        var partB = await SeedPartAsync(supplierId, name: "B", sku: "SKU-B");

        var client = _factory.CreateClient().AsUser(userId: 1, roles: "PartsClerk");

        var res = await client.PutAsJsonAsync($"/api/parts/{partB}", new
        {
            name = "B",
            sku = "sku-a", 
            category = "Brakes",
            unitCost = 1.0,
            reorderPoint = 0,
            supplierId,
            isActive = true
        });

        res.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Update_requires_supplierId_and_existing_supplier()
    {
        await ResetDbAsync();

        var supplierId = await SeedSupplierAsync("Supplier Update Supplier");
        var partId = await SeedPartAsync(supplierId, name: "X", sku: "UPD-SUP-1");

        var client = _factory.CreateClient().AsUser(userId: 1, roles: "PartsClerk");

        var res1 = await client.PutAsJsonAsync($"/api/parts/{partId}", new
        {
            name = "X",
            sku = "UPD-SUP-1",
            category = "Brakes",
            unitCost = 1.0,
            reorderPoint = 0,
            supplierId = 0,
            isActive = true
        });
        res1.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var res2 = await client.PutAsJsonAsync($"/api/parts/{partId}", new
        {
            name = "X",
            sku = "UPD-SUP-1",
            category = "Brakes",
            unitCost = 1.0,
            reorderPoint = 0,
            supplierId = 999999,
            isActive = true
        });
        res2.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Delete_requires_role()
    {
        await ResetDbAsync();

        var supplierId = await SeedSupplierAsync("Supplier Delete Forbidden");
        var partId = await SeedPartAsync(supplierId, name: "Delete Me", sku: "DEL-001");

        var client = _factory.CreateClient().AsUser(userId: 1, roles: "Driver");

        var res = await client.DeleteAsync($"/api/parts/{partId}");

        res.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Delete_returns_404_when_missing()
    {
        await ResetDbAsync();

        var client = _factory.CreateClient().AsUser(userId: 1, roles: "PartsClerk");

        var res = await client.DeleteAsync("/api/parts/999999");

        res.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Delete_success_returns_204_and_removes_part()
    {
        await ResetDbAsync();

        var supplierId = await SeedSupplierAsync("Supplier Delete");
        var partId = await SeedPartAsync(supplierId, name: "Delete Me", sku: "DEL-OK-001");

        var client = _factory.CreateClient().AsUser(userId: 1, roles: "PartsClerk");

        var del = await client.DeleteAsync($"/api/parts/{partId}");
        del.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var get = await client.GetAsync($"/api/parts/{partId}");
        get.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    private sealed class PartReadLike
    {
        public int Id { get; set; }
        public string Name { get; set; } = "";
        public string Sku { get; set; } = "";
        public string Category { get; set; } = "";
        public decimal UnitCost { get; set; }
        public int ReorderPoint { get; set; }
        public int SupplierId { get; set; }
        public string? SupplierName { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public int? CurrentStock { get; set; }
        public bool? NeedsReorder { get; set; }
    }
}