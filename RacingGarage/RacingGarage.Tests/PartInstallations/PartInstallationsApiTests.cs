using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RacingGarage.Data;
using RacingGarage.dto;
using RacingGarage.Models;
using Xunit;

namespace RacingGarage.Tests.PartInstallations;

public class PartInstallationsApiTests : IClassFixture<TestAppFactory>
{
    private readonly TestAppFactory _factory;

    public PartInstallationsApiTests(TestAppFactory factory) => _factory = factory;

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

    private async Task<int> SeedUserAsync(string roleName)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var roleId = await EnsureRoleAsync(roleName);

        var user = new AppUser
        {
            FirstName = "User",
            LastName = $"{roleName} {U("N")}",
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

    private async Task<int> SeedTeamCarAsync(string? carNumber = null, string status = "Active")
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var car = new TeamCar
        {
            CarNumber = (carNumber ?? U("CAR")).ToUpperInvariant(),
            Status = status
        };

        db.TeamCars.Add(car);
        await db.SaveChangesAsync();
        return car.Id;
    }

    private async Task<int> SeedWorkOrderAsync(int teamCarId, int createdByUserId)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var wo = new WorkOrder
        {
            TeamCarId = teamCarId,
            CreatedByUserId = createdByUserId,
            AssignedToUserId = null,
            CarSessionId = null,
            Title = "WO " + U("T"),
            Description = "",
            Priority = "Medium",
            Status = "Open",
            CreatedAt = DateTime.UtcNow,
            DueDate = null,
            ClosedAt = null,
        };

        db.WorkOrders.Add(wo);
        await db.SaveChangesAsync();
        return wo.Id;
    }

    private async Task<int> SeedSupplierAsync(string? name = null)
    {
        using var scope = _factory.Services.CreateScope();
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
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        db.Suppliers.Add(s);
        await db.SaveChangesAsync();
        return s.Id;
    }

    private async Task<int> SeedPartAsync(int supplierId, bool active = true, string? sku = null)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var p = new Part
        {
            Name = "Part " + U("P"),
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
            Name = "Loc " + U("L"),
            Code = (code ?? Guid.NewGuid().ToString("N")[..6]).ToUpperInvariant(),
            Description = "",
            IsActive = active,
            CreatedAt = DateTime.UtcNow
        };

        db.InventoryLocations.Add(loc);
        await db.SaveChangesAsync();
        return loc.Id;
    }

    private async Task SeedStockAsync(int partId, int locId, int qty)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var existing = await db.InventoryStock
            .FirstOrDefaultAsync(s => s.PartId == partId && s.InventoryLocationId == locId);

        if (existing == null)
        {
            db.InventoryStock.Add(new Models.InventoryStock
            {
                PartId = partId,
                InventoryLocationId = locId,
                Quantity = qty,
                UpdatedAt = DateTime.UtcNow
            });
        }
        else
        {
            existing.Quantity = qty;
            existing.UpdatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync();
    }

    [Fact]
    public async Task GetAll_returns_200_for_authenticated_user()
    {
        var userId = await SeedUserAsync("Driver");
        var client = _factory.CreateClient().AsUser(userId: userId, roles: "Driver");

        var res = await client.GetAsync("/api/part-installations");

        res.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetAll_filters_by_workOrderId()
    {
        var driverId = await SeedUserAsync("Driver");
        var car1 = await SeedTeamCarAsync();
        var car2 = await SeedTeamCarAsync();

        var wo1 = await SeedWorkOrderAsync(car1, driverId);
        var wo2 = await SeedWorkOrderAsync(car2, driverId);

        var supplierId = await SeedSupplierAsync();
        var partId = await SeedPartAsync(supplierId, active: true);
        var locId = await SeedLocationAsync(active: true);

        await SeedStockAsync(partId, locId, qty: 50);

        int inst1Id;
        int inst2Id;

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var mechId = await SeedUserAsync("Mechanic");

            var inst1 = new PartInstallation
            {
                WorkOrderId = wo1,
                PartId = partId,
                InventoryLocationId = locId,
                Quantity = 2,
                InstalledByUserId = mechId,
                InstalledAt = DateTime.UtcNow.AddMinutes(-10),
                Notes = "A"
            };
            var inst2 = new PartInstallation
            {
                WorkOrderId = wo2,
                PartId = partId,
                InventoryLocationId = locId,
                Quantity = 3,
                InstalledByUserId = mechId,
                InstalledAt = DateTime.UtcNow.AddMinutes(-5),
                Notes = "B"
            };

            db.PartInstallations.AddRange(inst1, inst2);
            await db.SaveChangesAsync();

            inst1Id = inst1.Id;
            inst2Id = inst2.Id;
        }

        var client = _factory.CreateClient().AsUser(userId: driverId, roles: "Driver");

        var res = await client.GetAsync($"/api/part-installations?workOrderId={wo1}");
        res.StatusCode.Should().Be(HttpStatusCode.OK);

        var list = await res.Content.ReadFromJsonAsync<List<PartInstallationReadDto>>();
        list.Should().NotBeNull();
        list!.Select(x => x.Id).Should().Contain(inst1Id);
        list.Select(x => x.Id).Should().NotContain(inst2Id);
        list.All(x => x.WorkOrderId == wo1).Should().BeTrue();
    }

    [Fact]
    public async Task GetById_returns_404_when_missing()
    {
        var userId = await SeedUserAsync("Driver");
        var client = _factory.CreateClient().AsUser(userId: userId, roles: "Driver");

        var res = await client.GetAsync("/api/part-installations/999999");

        res.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Create_requires_auth()
    {
        var res = await _factory.CreateClient().AsAnonymous()
            .PostAsJsonAsync("/api/part-installations", new { });

        res.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Create_requires_role()
    {
        var driverId = await SeedUserAsync("Driver");
        var client = _factory.CreateClient().AsUser(userId: driverId, roles: "Driver");

        var res = await client.PostAsJsonAsync("/api/part-installations", new
        {
            workOrderId = 1,
            partId = 1,
            inventoryLocationId = 1,
            quantity = 1
        });

        res.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Create_rejects_missing_workOrder()
    {
        var mechId = await SeedUserAsync("Mechanic");
        var supplierId = await SeedSupplierAsync();
        var partId = await SeedPartAsync(supplierId, active: true);
        var locId = await SeedLocationAsync(active: true);

        await SeedStockAsync(partId, locId, qty: 10);

        var client = _factory.CreateClient().AsUser(userId: mechId, roles: "Mechanic");

        var res = await client.PostAsJsonAsync("/api/part-installations", new
        {
            workOrderId = 999999,
            partId,
            inventoryLocationId = locId,
            quantity = 1
        });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Create_rejects_inactive_part()
    {
        var mechId = await SeedUserAsync("Mechanic");
        var driverId = await SeedUserAsync("Driver");
        var carId = await SeedTeamCarAsync();
        var woId = await SeedWorkOrderAsync(carId, driverId);

        var supplierId = await SeedSupplierAsync();
        var partId = await SeedPartAsync(supplierId, active: false);
        var locId = await SeedLocationAsync(active: true);

        await SeedStockAsync(partId, locId, qty: 10);

        var client = _factory.CreateClient().AsUser(userId: mechId, roles: "Mechanic");

        var res = await client.PostAsJsonAsync("/api/part-installations", new
        {
            workOrderId = woId,
            partId,
            inventoryLocationId = locId,
            quantity = 1
        });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Create_rejects_inactive_location()
    {
        var mechId = await SeedUserAsync("Mechanic");
        var driverId = await SeedUserAsync("Driver");
        var carId = await SeedTeamCarAsync();
        var woId = await SeedWorkOrderAsync(carId, driverId);

        var supplierId = await SeedSupplierAsync();
        var partId = await SeedPartAsync(supplierId, active: true);
        var locId = await SeedLocationAsync(active: false);

        await SeedStockAsync(partId, locId, qty: 10);

        var client = _factory.CreateClient().AsUser(userId: mechId, roles: "Mechanic");

        var res = await client.PostAsJsonAsync("/api/part-installations", new
        {
            workOrderId = woId,
            partId,
            inventoryLocationId = locId,
            quantity = 1
        });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Create_rejects_when_no_stock_row_exists()
    {
        var mechId = await SeedUserAsync("Mechanic");
        var driverId = await SeedUserAsync("Driver");
        var carId = await SeedTeamCarAsync();
        var woId = await SeedWorkOrderAsync(carId, driverId);

        var supplierId = await SeedSupplierAsync();
        var partId = await SeedPartAsync(supplierId, active: true);
        var locId = await SeedLocationAsync(active: true);

        var client = _factory.CreateClient().AsUser(userId: mechId, roles: "Mechanic");

        var res = await client.PostAsJsonAsync("/api/part-installations", new
        {
            workOrderId = woId,
            partId,
            inventoryLocationId = locId,
            quantity = 1
        });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Create_rejects_when_stock_would_go_negative()
    {
        var mechId = await SeedUserAsync("Mechanic");
        var driverId = await SeedUserAsync("Driver");
        var carId = await SeedTeamCarAsync();
        var woId = await SeedWorkOrderAsync(carId, driverId);

        var supplierId = await SeedSupplierAsync();
        var partId = await SeedPartAsync(supplierId, active: true);
        var locId = await SeedLocationAsync(active: true);

        await SeedStockAsync(partId, locId, qty: 2);

        var client = _factory.CreateClient().AsUser(userId: mechId, roles: "Mechanic");

        var res = await client.PostAsJsonAsync("/api/part-installations", new
        {
            workOrderId = woId,
            partId,
            inventoryLocationId = locId,
            quantity = 3
        });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Create_valid_returns_201_decrements_stock_and_creates_movement()
    {
        var mechId = await SeedUserAsync("Mechanic");
        var driverId = await SeedUserAsync("Driver");
        var carId = await SeedTeamCarAsync();
        var woId = await SeedWorkOrderAsync(carId, driverId);

        var supplierId = await SeedSupplierAsync();
        var partId = await SeedPartAsync(supplierId, active: true);
        var locId = await SeedLocationAsync(active: true);

        await SeedStockAsync(partId, locId, qty: 10);

        var client = _factory.CreateClient().AsUser(userId: mechId, roles: "Mechanic");

        var res = await client.PostAsJsonAsync("/api/part-installations", new
        {
            workOrderId = woId,
            partId,
            inventoryLocationId = locId,
            quantity = 4,
            notes = "  installed  "
        });

        res.StatusCode.Should().Be(HttpStatusCode.Created);

        var body = await res.Content.ReadFromJsonAsync<PartInstallationReadDto>();
        body.Should().NotBeNull();
        body!.WorkOrderId.Should().Be(woId);
        body.PartId.Should().Be(partId);
        body.InventoryLocationId.Should().Be(locId);
        body.Quantity.Should().Be(4);
        body.InstalledByUserId.Should().Be(mechId);
        body.Notes.Should().Be("installed");

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var stock = await db.InventoryStock.AsNoTracking()
            .FirstAsync(s => s.PartId == partId && s.InventoryLocationId == locId);
        stock.Quantity.Should().Be(6);

        var movement = await db.InventoryMovements.AsNoTracking()
            .OrderByDescending(m => m.Id)
            .FirstAsync();

        movement.PartId.Should().Be(partId);
        movement.InventoryLocationId.Should().Be(locId);
        movement.WorkOrderId.Should().Be(woId);
        movement.QuantityChange.Should().Be(-4);
        movement.Reason.Should().Be("Install");
        movement.PerformedByUserId.Should().Be(mechId);
        movement.Notes.Should().Be("installed");
    }

    [Fact]
    public async Task Delete_requires_auth()
    {
        var res = await _factory.CreateClient().AsAnonymous()
            .DeleteAsync("/api/part-installations/1");

        res.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Delete_requires_role()
    {
        var driverId = await SeedUserAsync("Driver");
        var client = _factory.CreateClient().AsUser(userId: driverId, roles: "Driver");

        var res = await client.DeleteAsync("/api/part-installations/1");

        res.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Delete_returns_404_when_missing()
    {
        var mechId = await SeedUserAsync("Mechanic");
        var client = _factory.CreateClient().AsUser(userId: mechId, roles: "Mechanic");

        var res = await client.DeleteAsync("/api/part-installations/999999");

        res.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Delete_returns_400_when_stock_row_missing_to_restore()
    {
        var mechId = await SeedUserAsync("Mechanic");
        var driverId = await SeedUserAsync("Driver");
        var carId = await SeedTeamCarAsync();
        var woId = await SeedWorkOrderAsync(carId, driverId);

        var supplierId = await SeedSupplierAsync();
        var partId = await SeedPartAsync(supplierId, active: true);
        var locId = await SeedLocationAsync(active: true);

        int installId;

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var pi = new PartInstallation
            {
                WorkOrderId = woId,
                PartId = partId,
                InventoryLocationId = locId,
                Quantity = 2,
                InstalledByUserId = mechId,
                InstalledAt = DateTime.UtcNow,
                Notes = ""
            };

            db.PartInstallations.Add(pi);
            await db.SaveChangesAsync();
            installId = pi.Id;
        }

        var client = _factory.CreateClient().AsUser(userId: mechId, roles: "Mechanic");

        var res = await client.DeleteAsync($"/api/part-installations/{installId}");

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Delete_valid_restores_stock_and_removes_installation()
    {
        var mechId = await SeedUserAsync("Mechanic");
        var driverId = await SeedUserAsync("Driver");
        var carId = await SeedTeamCarAsync();
        var woId = await SeedWorkOrderAsync(carId, driverId);

        var supplierId = await SeedSupplierAsync();
        var partId = await SeedPartAsync(supplierId, active: true);
        var locId = await SeedLocationAsync(active: true);

        await SeedStockAsync(partId, locId, qty: 5);

        int installId;

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var stock = await db.InventoryStock.FirstAsync(s => s.PartId == partId && s.InventoryLocationId == locId);
            stock.Quantity = 2;
            stock.UpdatedAt = DateTime.UtcNow;

            var pi = new PartInstallation
            {
                WorkOrderId = woId,
                PartId = partId,
                InventoryLocationId = locId,
                Quantity = 3,
                InstalledByUserId = mechId,
                InstalledAt = DateTime.UtcNow,
                Notes = ""
            };

            db.PartInstallations.Add(pi);
            await db.SaveChangesAsync();
            installId = pi.Id;
        }

        var client = _factory.CreateClient().AsUser(userId: mechId, roles: "Mechanic");

        var res = await client.DeleteAsync($"/api/part-installations/{installId}");
        res.StatusCode.Should().Be(HttpStatusCode.NoContent);

        using var verifyScope = _factory.Services.CreateScope();
        var verifyDb = verifyScope.ServiceProvider.GetRequiredService<AppDbContext>();

        var stockAfter = await verifyDb.InventoryStock.AsNoTracking()
            .FirstAsync(s => s.PartId == partId && s.InventoryLocationId == locId);
        stockAfter.Quantity.Should().Be(5);

        var exists = await verifyDb.PartInstallations.AnyAsync(x => x.Id == installId);
        exists.Should().BeFalse();
    }
}