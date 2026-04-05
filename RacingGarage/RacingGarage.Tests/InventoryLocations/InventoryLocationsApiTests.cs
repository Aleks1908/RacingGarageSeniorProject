using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RacingGarage.Data;
using RacingGarage.Models;
using Xunit;

namespace RacingGarage.Tests.InventoryLocations;

public class InventoryLocationsApiTests : IClassFixture<TestAppFactory>
{
    private readonly TestAppFactory _factory;
    private static int _codeSeq = 1000;

    public InventoryLocationsApiTests(TestAppFactory factory) => _factory = factory;

    private async Task<int> SeedLocationAsync(
        string? name = null,
        string? code = null,
        bool isActive = true,
        string? description = null)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var loc = new InventoryLocation
        {
            Name = name ?? $"Seed Location {Guid.NewGuid():N}",
            Code = (code ?? $"LOC-{Interlocked.Increment(ref _codeSeq)}").Trim().ToUpperInvariant(),
            Description = description ?? "",
            IsActive = isActive,
            CreatedAt = DateTime.UtcNow
        };

        db.InventoryLocations.Add(loc);
        await db.SaveChangesAsync();
        return loc.Id;
    }

    private sealed class InventoryLocationRead
    {
        public int Id { get; set; }
        public string? Name { get; set; }
        public string? Code { get; set; }
        public string? Description { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    [Fact]
    public async Task GetAll_returns_200_for_authenticated_user()
    {
        var client = _factory.CreateClient().AsUser(userId: 1, roles: "Driver");

        var res = await client.GetAsync("/api/inventory-locations");

        res.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetAll_activeOnly_true_filters_out_inactive()
    {
        await SeedLocationAsync(name: "Active A", code: "A-ONE", isActive: true);
        await SeedLocationAsync(name: "Inactive B", code: "B-TWO", isActive: false);

        var client = _factory.CreateClient().AsUser(userId: 1, roles: "Driver");

        var list = await client.GetFromJsonAsync<List<InventoryLocationRead>>("/api/inventory-locations?activeOnly=true");

        list.Should().NotBeNull();
        list!.Should().OnlyContain(x => x.IsActive);
        list.Select(x => x.Code).Should().Contain("A-ONE");
        list.Select(x => x.Code).Should().NotContain("B-TWO");
    }

    [Fact]
    public async Task GetById_returns_404_when_missing()
    {
        var client = _factory.CreateClient().AsUser(userId: 1, roles: "Driver");

        var res = await client.GetAsync("/api/inventory-locations/999999");

        res.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetById_returns_200_when_exists()
    {
        var id = await SeedLocationAsync(name: "Main Shelf", code: "SHELF-1", description: "Near entrance");

        var client = _factory.CreateClient().AsUser(userId: 1, roles: "Driver");

        var res = await client.GetAsync($"/api/inventory-locations/{id}");
        res.StatusCode.Should().Be(HttpStatusCode.OK);

        var dto = await res.Content.ReadFromJsonAsync<InventoryLocationRead>();
        dto.Should().NotBeNull();
        dto!.Id.Should().Be(id);
        dto.Code.Should().Be("SHELF-1");
        dto.Name.Should().Be("Main Shelf");
        dto.Description.Should().Be("Near entrance");
    }

    [Fact]
    public async Task Create_requires_role()
    {
        var client = _factory.CreateClient().AsUser(userId: 1, roles: "Driver");

        var res = await client.PostAsJsonAsync("/api/inventory-locations", new
        {
            name = "New Loc",
            code = "new-1",
            description = ""
        });

        res.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Create_requires_name()
    {
        var client = _factory.CreateClient().AsUser(userId: 1, roles: "PartsClerk");

        var res = await client.PostAsJsonAsync("/api/inventory-locations", new
        {
            name = "",
            code = "X-1",
            description = ""
        });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Create_requires_code()
    {
        var client = _factory.CreateClient().AsUser(userId: 1, roles: "PartsClerk");

        var res = await client.PostAsJsonAsync("/api/inventory-locations", new
        {
            name = "Loc",
            code = "  ",
            description = ""
        });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Create_duplicate_code_returns_409()
    {
        await SeedLocationAsync(name: "Existing", code: "DUP-LOC");

        var client = _factory.CreateClient().AsUser(userId: 1, roles: "PartsClerk");

        var res = await client.PostAsJsonAsync("/api/inventory-locations", new
        {
            name = "New Name",
            code = "dup-loc",
            description = ""
        });

        res.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Create_valid_returns_201_and_normalizes_code()
    {
        var client = _factory.CreateClient().AsUser(userId: 1, roles: "PartsClerk");

        var res = await client.PostAsJsonAsync("/api/inventory-locations", new
        {
            name = " Tire Rack ",
            code = " tr-01 ",
            description = "  back wall "
        });

        res.StatusCode.Should().Be(HttpStatusCode.Created);

        var created = await res.Content.ReadFromJsonAsync<InventoryLocationRead>();
        created.Should().NotBeNull();
        created!.Name.Should().Be("Tire Rack");
        created.Code.Should().Be("TR-01");
        created.Description.Should().Be("back wall");
        created.IsActive.Should().BeTrue();
    }

    [Fact]
    public async Task Update_requires_role()
    {
        var id = await SeedLocationAsync(name: "X", code: "X-1");

        var client = _factory.CreateClient().AsUser(userId: 1, roles: "Driver");

        var res = await client.PutAsJsonAsync($"/api/inventory-locations/{id}", new
        {
            name = "X2",
            code = "X-2",
            description = "",
            isActive = true
        });

        res.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Update_returns_404_when_missing_and_payload_valid()
    {
        var client = _factory.CreateClient().AsUser(userId: 1, roles: "PartsClerk");

        var res = await client.PutAsJsonAsync("/api/inventory-locations/999999", new
        {
            name = "X",
            code = "X-1",
            description = "",
            isActive = true
        });

        res.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Update_duplicate_code_returns_409()
    {
        var idA = await SeedLocationAsync(name: "A", code: "A-1");
        var idB = await SeedLocationAsync(name: "B", code: "B-1");

        var client = _factory.CreateClient().AsUser(userId: 1, roles: "PartsClerk");

        var res = await client.PutAsJsonAsync($"/api/inventory-locations/{idB}", new
        {
            name = "B updated",
            code = "a-1",
            description = "",
            isActive = true
        });

        res.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Update_valid_returns_204_and_persists_changes()
    {
        var id = await SeedLocationAsync(name: "Old", code: "OLD-1", description: "x", isActive: true);

        var client = _factory.CreateClient().AsUser(userId: 1, roles: "PartsClerk");

        var res = await client.PutAsJsonAsync($"/api/inventory-locations/{id}", new
        {
            name = " New Name ",
            code = " new-2 ",
            description = "  desc  ",
            isActive = false
        });

        res.StatusCode.Should().Be(HttpStatusCode.NoContent);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var updated = await db.InventoryLocations.FindAsync(id);

        updated.Should().NotBeNull();
        updated!.Name.Should().Be("New Name");
        updated.Code.Should().Be("NEW-2");
        updated.Description.Should().Be("desc");
        updated.IsActive.Should().BeFalse();
    }

    [Fact]
    public async Task Delete_requires_role()
    {
        var id = await SeedLocationAsync(name: "Del", code: "DEL-1");

        var client = _factory.CreateClient().AsUser(userId: 1, roles: "Driver");

        var res = await client.DeleteAsync($"/api/inventory-locations/{id}");

        res.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Delete_returns_404_when_missing()
    {
        var client = _factory.CreateClient().AsUser(userId: 1, roles: "PartsClerk");

        var res = await client.DeleteAsync("/api/inventory-locations/999999");

        res.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Delete_valid_returns_204_and_removes_row()
    {
        var id = await SeedLocationAsync(name: "Del", code: "DEL-2");

        var client = _factory.CreateClient().AsUser(userId: 1, roles: "PartsClerk");

        var res = await client.DeleteAsync($"/api/inventory-locations/{id}");
        res.StatusCode.Should().Be(HttpStatusCode.NoContent);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var exists = await db.InventoryLocations.AnyAsync(x => x.Id == id);
        exists.Should().BeFalse();
    }
}