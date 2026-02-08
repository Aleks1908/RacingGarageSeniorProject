using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RacingGarage.Models;

namespace RacingGarage.Data;

public static class DbSeeder
{
    public static async Task SeedAllAsync(AppDbContext db)
    {
        await SeedRolesAsync(db);
        await SeedTestUsersAsync(db);
        await SeedDemoDataAsync(db);
    }

    public static async Task SeedRolesAsync(AppDbContext db)
    {
        if (await db.Roles.AnyAsync())
            return;

        var roles = new[]
        {
            new Role { Name = "Manager" },
            new Role { Name = "Mechanic" },
            new Role { Name = "Driver" },
            new Role { Name = "PartsClerk" }
        };

        db.Roles.AddRange(roles);
        await db.SaveChangesAsync();
    }

    public static async Task SeedTestUsersAsync(AppDbContext db)
    {
        if (await db.Users.AnyAsync())
            return;

        if (!await db.Roles.AnyAsync())
            await SeedRolesAsync(db);

        var roles = await db.Roles.ToDictionaryAsync(r => r.Name, r => r.Id);

        var manager = new AppUser { Name = "Test Manager", Email = "manager@test.com", IsActive = true, CreatedAt = DateTime.UtcNow };
        manager.PasswordHash = HashPassword(manager, "Manager123!");

        var mechanic = new AppUser { Name = "Test Mechanic", Email = "mechanic@test.com", IsActive = true, CreatedAt = DateTime.UtcNow };
        mechanic.PasswordHash = HashPassword(mechanic, "Mechanic123!");

        var driver = new AppUser { Name = "Test Driver", Email = "driver@test.com", IsActive = true, CreatedAt = DateTime.UtcNow };
        driver.PasswordHash = HashPassword(driver, "Driver123!");

        var parts = new AppUser { Name = "Test Parts", Email = "parts@test.com", IsActive = true, CreatedAt = DateTime.UtcNow };
        parts.PasswordHash = HashPassword(parts, "Parts123!");

        db.Users.AddRange(manager, mechanic, driver, parts);
        await db.SaveChangesAsync();

        db.UserRoles.AddRange(
            new UserRole { UserId = manager.Id, RoleId = roles["Manager"] },
            new UserRole { UserId = mechanic.Id, RoleId = roles["Mechanic"] },
            new UserRole { UserId = driver.Id, RoleId = roles["Driver"] },
            new UserRole { UserId = parts.Id, RoleId = roles["PartsClerk"] }
        );

        await db.SaveChangesAsync();
    }

    public static async Task SeedDemoDataAsync(AppDbContext db)
    {
        if (await db.TeamCars.AnyAsync() ||
            await db.Parts.AnyAsync() ||
            await db.InventoryLocations.AnyAsync() ||
            await db.WorkOrders.AnyAsync() ||
            await db.IssueReports.AnyAsync())
            return;
        
        var manager = await db.Users.FirstAsync(u => u.Email == "manager@test.com");
        var mechanic = await db.Users.FirstAsync(u => u.Email == "mechanic@test.com");
        var driver = await db.Users.FirstAsync(u => u.Email == "driver@test.com");
        var partsClerk = await db.Users.FirstAsync(u => u.Email == "parts@test.com");
        
        var supplier = new Supplier
        {
            Name = "Brembo Motorsport",
            ContactEmail = "sales@brembo.example",
            Phone = "+39 000 000",
            AddressLine1 = "Via Example 1",
            AddressLine2 = "",
            City = "Bergamo",
            Country = "Italy",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        db.Suppliers.Add(supplier);
        
        var mainGarage = new InventoryLocation
        {
            Name = "Main Garage",
            Code = "GARAGE-1",
            Description = "Primary parts storage",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        var trackBox = new InventoryLocation
        {
            Name = "Track Box",
            Code = "TRACK-BOX",
            Description = "Mobile track-day stock",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        db.InventoryLocations.AddRange(mainGarage, trackBox);

        
        var padFront = new Part
        {
            Name = "Front Brake Pad Set",
            Sku = "BRK-PAD-FRONT-001",
            Category = "Brakes",
            UnitCost = 199.99m,
            ReorderPoint = 2,
            Supplier = supplier,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        var brakeFluid = new Part
        {
            Name = "Racing Brake Fluid 1L",
            Sku = "BRK-FLUID-001",
            Category = "Fluids",
            UnitCost = 39.50m,
            ReorderPoint = 3,
            Supplier = supplier,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        var oil5w40 = new Part
        {
            Name = "Engine Oil 5W-40 1L",
            Sku = "OIL-5W40-001",
            Category = "Fluids",
            UnitCost = 18.90m,
            ReorderPoint = 6,
            Supplier = supplier,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        db.Parts.AddRange(padFront, brakeFluid, oil5w40);
        
        var car1 = new TeamCar
        {
            CarNumber = "27",
            Nickname = "Blue Rocket",
            Make = "BMW",
            Model = "E36",
            Year = 1996,
            CarClass = "Time Attack",
            Status = "Active",
            OdometerKm = 120000,
            CreatedAt = DateTime.UtcNow
        };

        var car2 = new TeamCar
        {
            CarNumber = "11",
            Nickname = "Red Comet",
            Make = "Honda",
            Model = "Civic EK",
            Year = 1999,
            CarClass = "Track Day",
            Status = "Active",
            OdometerKm = 180000,
            CreatedAt = DateTime.UtcNow
        };

        db.TeamCars.AddRange(car1, car2);

        await db.SaveChangesAsync(); 

        var session1 = new CarSession
        {
            TeamCarId = car1.Id,
            SessionType = "Practice",
            Date = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-7)),
            TrackName = "Serres Circuit",
            DriverUserId = driver.Id,
            Laps = 18,
            Notes = "Good pace, brakes got soft near end."
        };

        var session2 = new CarSession
        {
            TeamCarId = car2.Id,
            SessionType = "Qualifying",
            Date = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-3)),
            TrackName = "Serres Circuit",
            DriverUserId = driver.Id,
            Laps = 10,
            Notes = "Stable session, no major issues."
        };

        db.CarSessions.AddRange(session1, session2);
        await db.SaveChangesAsync();
        
        var issue1 = new IssueReport
        {
            TeamCarId = car1.Id,
            CarSessionId = session1.Id,
            ReportedByUserId = driver.Id,
            Title = "Brake pedal feels soft",
            Description = "After lap 12, pedal travel increased. Possible air in lines.",
            Severity = "High",
            Status = "Open",
            ReportedAt = DateTime.UtcNow.AddDays(-7)
        };

        var issue2 = new IssueReport
        {
            TeamCarId = car2.Id,
            CarSessionId = session2.Id,
            ReportedByUserId = driver.Id,
            Title = "Slight vibration at speed",
            Description = "Noticeable at 140+ km/h. Could be wheel balance.",
            Severity = "Medium",
            Status = "Reviewed",
            ReportedAt = DateTime.UtcNow.AddDays(-3)
        };

        db.IssueReports.AddRange(issue1, issue2);
        await db.SaveChangesAsync();
        
        var wo1 = new WorkOrder
        {
            TeamCarId = car1.Id,
            CreatedByUserId = manager.Id,
            AssignedToUserId = mechanic.Id,
            CarSessionId = session1.Id,
            Title = "Brake system inspection",
            Description = "Investigate soft pedal; bleed brakes; inspect pads.",
            Priority = "High",
            Status = "Open",
            CreatedAt = DateTime.UtcNow.AddDays(-6)
        };

        db.WorkOrders.Add(wo1);
        await db.SaveChangesAsync();
        
        issue1.LinkedWorkOrderId = wo1.Id;
        issue1.Status = "Linked";

        var t1 = new WorkOrderTask
        {
            WorkOrderId = wo1.Id,
            Title = "Bleed brakes",
            Description = "Bleed all corners; verify pedal firmness",
            Status = "Todo",
            SortOrder = 1,
            EstimatedMinutes = 45
        };

        var t2 = new WorkOrderTask
        {
            WorkOrderId = wo1.Id,
            Title = "Inspect brake pads",
            Description = "Check pad thickness and wear pattern",
            Status = "Todo",
            SortOrder = 2,
            EstimatedMinutes = 20
        };

        db.WorkOrderTasks.AddRange(t1, t2);
        await db.SaveChangesAsync();

        var labor1 = new LaborLog
        {
            WorkOrderTaskId = t1.Id,
            MechanicUserId = mechanic.Id,
            Minutes = 35,
            LogDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-6)),
            Comment = "Bled brakes, pedal feel improved."
        };

        db.LaborLogs.Add(labor1);
        await db.SaveChangesAsync();
        
        await using var tx = await db.Database.BeginTransactionAsync();
        
        db.InventoryStock.AddRange(
            new InventoryStock
            {
                PartId = padFront.Id,
                InventoryLocationId = mainGarage.Id,
                Quantity = 6,
                UpdatedAt = DateTime.UtcNow
            },
            new InventoryStock
            {
                PartId = brakeFluid.Id,
                InventoryLocationId = mainGarage.Id,
                Quantity = 2,
                UpdatedAt = DateTime.UtcNow
            },
            new InventoryStock
            {
                PartId = oil5w40.Id,
                InventoryLocationId = trackBox.Id,
                Quantity = 8,
                UpdatedAt = DateTime.UtcNow
            }
        );

        await db.SaveChangesAsync();

        db.InventoryMovements.AddRange(
            new InventoryMovement
            {
                PartId = padFront.Id,
                InventoryLocationId = mainGarage.Id,
                QuantityChange = 6,
                Reason = "Receive",
                WorkOrderId = null,
                PerformedByUserId = partsClerk.Id,
                Notes = "Initial demo stock",
                PerformedAt = DateTime.UtcNow
            },
            new InventoryMovement
            {
                PartId = brakeFluid.Id,
                InventoryLocationId = mainGarage.Id,
                QuantityChange = 2,
                Reason = "Receive",
                WorkOrderId = null,
                PerformedByUserId = partsClerk.Id,
                Notes = "Initial demo stock",
                PerformedAt = DateTime.UtcNow
            },
            new InventoryMovement
            {
                PartId = oil5w40.Id,
                InventoryLocationId = trackBox.Id,
                QuantityChange = 8,
                Reason = "Receive",
                WorkOrderId = null,
                PerformedByUserId = partsClerk.Id,
                Notes = "Initial demo stock",
                PerformedAt = DateTime.UtcNow
            }
        );

        await db.SaveChangesAsync();

        var padStockRow = await db.InventoryStock
            .FirstAsync(s => s.PartId == padFront.Id && s.InventoryLocationId == mainGarage.Id);

        padStockRow.Quantity -= 2;
        padStockRow.UpdatedAt = DateTime.UtcNow;

        db.InventoryMovements.Add(new InventoryMovement
        {
            PartId = padFront.Id,
            InventoryLocationId = mainGarage.Id,
            QuantityChange = -2,
            Reason = "Install",
            WorkOrderId = wo1.Id,
            PerformedByUserId = mechanic.Id,
            Notes = "Installed new front pads (demo)",
            PerformedAt = DateTime.UtcNow
        });

        db.PartInstallations.Add(new PartInstallation
        {
            WorkOrderId = wo1.Id,
            PartId = padFront.Id,
            InventoryLocationId = mainGarage.Id,
            Quantity = 2,
            InstalledByUserId = mechanic.Id,
            InstalledAt = DateTime.UtcNow,
            Notes = "Installed new front pads (demo)"
        });

        await db.SaveChangesAsync();
        await tx.CommitAsync();
    }

    private static string HashPassword(AppUser user, string password)
    {
        var hasher = new PasswordHasher<AppUser>();
        return hasher.HashPassword(user, password);
    }
}