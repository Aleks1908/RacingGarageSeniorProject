using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RacingGarage.Data;
using RacingGarage.Models;
using Xunit;

namespace RacingGarage.Tests.Suppliers;

public class SuppliersApiTests : IClassFixture<TestAppFactory>
{
    private readonly TestAppFactory _factory;

    public SuppliersApiTests(TestAppFactory factory) => _factory = factory;

    private static string U(string prefix) => $"{prefix}-{Guid.NewGuid():N}";

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
            Name = name ?? U("Supplier"),
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

    [Fact]
    public async Task GetAll_returns_200_for_any_authenticated_user()
    {
        await ResetDbAsync();

        var client = _factory.CreateClient().AsUser(userId: 1, roles: "Driver");
        var res = await client.GetAsync("/api/suppliers");

        res.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetAll_activeOnly_true_filters_out_inactive()
    {
        await ResetDbAsync();

        await SeedSupplierAsync("Active A", isActive: true);
        await SeedSupplierAsync("Inactive B", isActive: false);

        var client = _factory.CreateClient().AsUser(userId: 1, roles: "Driver");
        var res = await client.GetAsync("/api/suppliers?activeOnly=true");

        res.StatusCode.Should().Be(HttpStatusCode.OK);

        var list = await res.Content.ReadFromJsonAsync<List<SupplierReadLike>>();
        list.Should().NotBeNull();
        list!.Should().OnlyContain(x => x.IsActive);
        list.Select(x => x.Name).Should().Contain("Active A");
        list.Select(x => x.Name).Should().NotContain("Inactive B");
    }

    [Fact]
    public async Task GetById_returns_404_when_missing()
    {
        await ResetDbAsync();

        var client = _factory.CreateClient().AsUser(userId: 1, roles: "Driver");
        var res = await client.GetAsync("/api/suppliers/999999");

        res.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetById_returns_200_when_found()
    {
        await ResetDbAsync();

        var id = await SeedSupplierAsync("Get Supplier", isActive: true);

        var client = _factory.CreateClient().AsUser(userId: 1, roles: "Driver");
        var res = await client.GetAsync($"/api/suppliers/{id}");

        res.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await res.Content.ReadFromJsonAsync<SupplierReadLike>();
        body.Should().NotBeNull();
        body!.Id.Should().Be(id);
        body.Name.Should().Be("Get Supplier");
    }

    [Fact]
    public async Task Create_requires_role()
    {
        await ResetDbAsync();

        var client = _factory.CreateClient().AsUser(userId: 1, roles: "Driver");
        var res = await client.PostAsJsonAsync("/api/suppliers", new { name = "Nope Supplier" });

        res.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Create_requires_name()
    {
        await ResetDbAsync();

        var client = _factory.CreateClient().AsUser(userId: 1, roles: "PartsClerk");

        var res = await client.PostAsJsonAsync("/api/suppliers", new
        {
            name = "   ",
            contactEmail = "",
            phone = "",
            addressLine1 = "",
            addressLine2 = "",
            city = "",
            country = ""
        });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Create_duplicate_name_returns_409()
    {
        await ResetDbAsync();

        await SeedSupplierAsync("Duplicate Co");

        var client = _factory.CreateClient().AsUser(userId: 1, roles: "PartsClerk");

        var res = await client.PostAsJsonAsync("/api/suppliers", new
        {
            name = "Duplicate Co",
            contactEmail = "",
            phone = "",
            addressLine1 = "",
            addressLine2 = "",
            city = "",
            country = ""
        });

        res.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Create_trims_name_and_sets_active_true()
    {
        await ResetDbAsync();

        var client = _factory.CreateClient().AsUser(userId: 1, roles: "PartsClerk");

        var res = await client.PostAsJsonAsync("/api/suppliers", new
        {
            name = "  Brembo Test  ",
            contactEmail = " test@brembo.com ",
            phone = " 123 ",
            addressLine1 = " a ",
            addressLine2 = "",
            city = " b ",
            country = " c "
        });

        res.StatusCode.Should().Be(HttpStatusCode.Created);

        var created = await res.Content.ReadFromJsonAsync<SupplierReadLike>();
        created.Should().NotBeNull();
        created!.Name.Should().Be("Brembo Test");
        created.IsActive.Should().BeTrue();
        created.ContactEmail.Should().Be("test@brembo.com");
        created.Phone.Should().Be("123");
        created.AddressLine1.Should().Be("a");
        created.City.Should().Be("b");
        created.Country.Should().Be("c");
    }

    [Fact]
    public async Task Create_valid_can_create_inactive_supplier()
    {
        await ResetDbAsync();

        var client = _factory.CreateClient().AsUser(userId: 1, roles: "PartsClerk");

        var res = await client.PostAsJsonAsync("/api/suppliers", new
        {
            name = "Archived Supplier",
            contactEmail = "",
            phone = "",
            addressLine1 = "",
            addressLine2 = "",
            city = "",
            country = "",
            isActive = false
        });

        res.StatusCode.Should().Be(HttpStatusCode.Created);

        var created = await res.Content.ReadFromJsonAsync<SupplierReadLike>();
        created.Should().NotBeNull();
        created!.IsActive.Should().BeFalse();
    }

    [Fact]
    public async Task Update_requires_role()
    {
        await ResetDbAsync();

        var id = await SeedSupplierAsync("Update Target");

        var client = _factory.CreateClient().AsUser(userId: 1, roles: "Driver");
        var res = await client.PutAsJsonAsync($"/api/suppliers/{id}", new
        {
            name = "Nope",
            contactEmail = "",
            phone = "",
            addressLine1 = "",
            addressLine2 = "",
            city = "",
            country = "",
            isActive = true
        });

        res.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Update_requires_name()
    {
        await ResetDbAsync();

        var id = await SeedSupplierAsync("Update Target");

        var client = _factory.CreateClient().AsUser(userId: 1, roles: "PartsClerk");
        var res = await client.PutAsJsonAsync($"/api/suppliers/{id}", new
        {
            name = "   ",
            contactEmail = "",
            phone = "",
            addressLine1 = "",
            addressLine2 = "",
            city = "",
            country = "",
            isActive = true
        });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Update_returns_404_when_missing()
    {
        await ResetDbAsync();

        var client = _factory.CreateClient().AsUser(userId: 1, roles: "PartsClerk");

        var res = await client.PutAsJsonAsync("/api/suppliers/999999", new
        {
            name = "X",
            contactEmail = "",
            phone = "",
            addressLine1 = "",
            addressLine2 = "",
            city = "",
            country = "",
            isActive = true
        });

        res.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Update_duplicate_name_returns_409_when_changing_name()
    {
        await ResetDbAsync();

        var a = await SeedSupplierAsync("Supplier A");
        var b = await SeedSupplierAsync("Supplier B");

        var client = _factory.CreateClient().AsUser(userId: 1, roles: "PartsClerk");

        var res = await client.PutAsJsonAsync($"/api/suppliers/{b}", new
        {
            name = "Supplier A",
            contactEmail = "",
            phone = "",
            addressLine1 = "",
            addressLine2 = "",
            city = "",
            country = "",
            isActive = true
        });

        res.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Update_success_returns_204_and_persists_changes_and_trims_fields()
    {
        await ResetDbAsync();

        var id = await SeedSupplierAsync("Before Name", isActive: true);

        var client = _factory.CreateClient().AsUser(userId: 1, roles: "PartsClerk");

        var res = await client.PutAsJsonAsync($"/api/suppliers/{id}", new
        {
            name = "  After Name  ",
            contactEmail = "  after@test.com ",
            phone = " 555 ",
            addressLine1 = " line1 ",
            addressLine2 = " line2 ",
            city = " city ",
            country = " country ",
            isActive = false
        });

        res.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var get = await client.GetAsync($"/api/suppliers/{id}");
        get.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await get.Content.ReadFromJsonAsync<SupplierReadLike>();
        body.Should().NotBeNull();
        body!.Name.Should().Be("After Name");
        body.ContactEmail.Should().Be("after@test.com");
        body.Phone.Should().Be("555");
        body.AddressLine1.Should().Be("line1");
        body.AddressLine2.Should().Be("line2");
        body.City.Should().Be("city");
        body.Country.Should().Be("country");
        body.IsActive.Should().BeFalse();
    }

    [Fact]
    public async Task Delete_requires_role()
    {
        await ResetDbAsync();

        var id = await SeedSupplierAsync("Delete Target", isActive: true);

        var client = _factory.CreateClient().AsUser(userId: 1, roles: "Driver");
        var res = await client.DeleteAsync($"/api/suppliers/{id}");

        res.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Delete_returns_404_when_missing()
    {
        await ResetDbAsync();

        var client = _factory.CreateClient().AsUser(userId: 1, roles: "PartsClerk");
        var res = await client.DeleteAsync("/api/suppliers/999999");

        res.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Delete_success_soft_deactivates_supplier()
    {
        await ResetDbAsync();

        var id = await SeedSupplierAsync("Soft Delete Supplier", isActive: true);

        var client = _factory.CreateClient().AsUser(userId: 1, roles: "PartsClerk");

        var del = await client.DeleteAsync($"/api/suppliers/{id}");
        del.StatusCode.Should().Be(HttpStatusCode.NoContent);
        
        var get = await client.GetAsync($"/api/suppliers/{id}");
        get.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await get.Content.ReadFromJsonAsync<SupplierReadLike>();
        body.Should().NotBeNull();
        body!.IsActive.Should().BeFalse();
        
        var listRes = await client.GetAsync("/api/suppliers?activeOnly=true");
        listRes.StatusCode.Should().Be(HttpStatusCode.OK);

        var list = await listRes.Content.ReadFromJsonAsync<List<SupplierReadLike>>();
        list.Should().NotBeNull();
        list!.Select(x => x.Id).Should().NotContain(id);
    }

    private sealed class SupplierReadLike
    {
        public int Id { get; set; }
        public string Name { get; set; } = "";
        public string ContactEmail { get; set; } = "";
        public string Phone { get; set; } = "";
        public string AddressLine1 { get; set; } = "";
        public string AddressLine2 { get; set; } = "";
        public string City { get; set; } = "";
        public string Country { get; set; } = "";
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}