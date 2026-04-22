using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RacingGarage.Models;

namespace RacingGarage.Data;

public static class DbSeeder
{
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

        var manager = new AppUser { FirstName = "Test",LastName = "Manager", Email = "manager@test.com", IsActive = true, CreatedAt = DateTime.UtcNow };
        manager.PasswordHash = HashPassword(manager, "Manager123!");

        var mechanic = new AppUser {FirstName = "Test",LastName = "Mechanic", Email = "mechanic@test.com", IsActive = true, CreatedAt = DateTime.UtcNow };
        mechanic.PasswordHash = HashPassword(mechanic, "Mechanic123!");

        var driver = new AppUser { FirstName = "Test",LastName = "Driver", Email = "driver@test.com", IsActive = true, CreatedAt = DateTime.UtcNow };
        driver.PasswordHash = HashPassword(driver, "Driver123!");

        var parts = new AppUser { FirstName = "Test",LastName = "Parts", Email = "parts@test.com", IsActive = true, CreatedAt = DateTime.UtcNow };
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
        
        // SUPPLIERS
        var brembo = new Supplier
        {
            Name = "Brembo Motorsport",
            ContactEmail = "sales@brembo.example",
            Phone = "+39 035 605 111",
            AddressLine1 = "Via Brembo 25",
            AddressLine2 = "",
            City = "Bergamo",
            Country = "Italy",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        
        var omp = new Supplier
        {
            Name = "OMP Racing",
            ContactEmail = "info@ompracing.example",
            Phone = "+39 011 098 7654",
            AddressLine1 = "Via Genova 32",
            AddressLine2 = "Industrial Zone",
            City = "Turin",
            Country = "Italy",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        
        var motul = new Supplier
        {
            Name = "Motul Europe",
            ContactEmail = "contact@motul.example",
            Phone = "+33 1 48 11 70 00",
            AddressLine1 = "119 Boulevard Felix Faure",
            AddressLine2 = "",
            City = "Aubervilliers",
            Country = "France",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        
        db.Suppliers.AddRange(brembo, omp, motul);
        
        // INVENTORY LOCATIONS
        var mainGarage = new InventoryLocation
        {
            Name = "Main Garage",
            Code = "GARAGE-1",
            Description = "Primary parts storage and workshop",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        var trackBox = new InventoryLocation
        {
            Name = "Track Box",
            Code = "TRACK-BOX",
            Description = "Mobile track-day emergency stock",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        
        var warehouse = new InventoryLocation
        {
            Name = "Warehouse",
            Code = "WH-MAIN",
            Description = "Bulk storage for pre-purchased parts",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        db.InventoryLocations.AddRange(mainGarage, trackBox, warehouse);
        await db.SaveChangesAsync();

        // === PARTS ===
        var frontBrakePads = new Part
        {
            Name = "Front Brake Pad Set - High Performance",
            Sku = "BRK-PAD-FRONT-001",
            Category = "Brakes",
            UnitCost = 249.99m,
            ReorderPoint = 2,
            SupplierId = brembo.Id,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        var rearBrakePads = new Part
        {
            Name = "Rear Brake Pad Set - High Performance",
            Sku = "BRK-PAD-REAR-001",
            Category = "Brakes",
            UnitCost = 199.99m,
            ReorderPoint = 2,
            SupplierId = brembo.Id,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        var brakeFluidDot4 = new Part
        {
            Name = "Racing Brake Fluid DOT 4 - 1L",
            Sku = "BRK-FLUID-DOT4-001",
            Category = "Fluids",
            UnitCost = 45.00m,
            ReorderPoint = 4,
            SupplierId = motul.Id,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        var brakeFluidDot5 = new Part
        {
            Name = "Racing Brake Fluid DOT 5.1 - 500ml",
            Sku = "BRK-FLUID-DOT5-001",
            Category = "Fluids",
            UnitCost = 39.50m,
            ReorderPoint = 3,
            SupplierId = motul.Id,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        var engineOil5w40 = new Part
        {
            Name = "Engine Oil 5W-40 Full Synthetic - 1L",
            Sku = "OIL-5W40-001",
            Category = "Fluids",
            UnitCost = 22.90m,
            ReorderPoint = 6,
            SupplierId = motul.Id,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        var engineOil10w60 = new Part
        {
            Name = "Engine Oil 10W-60 Racing - 1L",
            Sku = "OIL-10W60-001",
            Category = "Fluids",
            UnitCost = 29.90m,
            ReorderPoint = 4,
            SupplierId = motul.Id,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        var coolant = new Part
        {
            Name = "Racing Coolant/Antifreeze - 5L",
            Sku = "COOL-001",
            Category = "Fluids",
            UnitCost = 35.00m,
            ReorderPoint = 2,
            SupplierId = motul.Id,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        var sparkPlugs = new Part
        {
            Name = "Spark Plug Set (4-pack)",
            Sku = "IGN-PLUG-001",
            Category = "Ignition",
            UnitCost = 48.00m,
            ReorderPoint = 2,
            SupplierId = brembo.Id,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        var airFilter = new Part
        {
            Name = "High-Flow Air Filter",
            Sku = "AIR-FILTER-001",
            Category = "Engine",
            UnitCost = 89.99m,
            ReorderPoint = 1,
            SupplierId = omp.Id,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        var oilFilter = new Part
        {
            Name = "Performance Oil Filter",
            Sku = "OIL-FILTER-001",
            Category = "Engine",
            UnitCost = 18.50m,
            ReorderPoint = 3,
            SupplierId = motul.Id,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        var racingSuit = new Part
        {
            Name = "FIA Racing Suit - Size L",
            Sku = "SAFE-SUIT-L-001",
            Category = "Safety",
            UnitCost = 899.00m,
            ReorderPoint = 1,
            SupplierId = omp.Id,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        var helmet = new Part
        {
            Name = "Racing Helmet - FIA Approved",
            Sku = "SAFE-HELM-001",
            Category = "Safety",
            UnitCost = 1299.00m,
            ReorderPoint = 1,
            SupplierId = omp.Id,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        var tireFrontLeft = new Part
        {
            Name = "Racing Tire - Front Left (245/40R18)",
            Sku = "TIRE-FL-245-001",
            Category = "Tires",
            UnitCost = 320.00m,
            ReorderPoint = 2,
            SupplierId = brembo.Id,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        var tireFrontRight = new Part
        {
            Name = "Racing Tire - Front Right (245/40R18)",
            Sku = "TIRE-FR-245-001",
            Category = "Tires",
            UnitCost = 320.00m,
            ReorderPoint = 2,
            SupplierId = brembo.Id,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        db.Parts.AddRange(
            frontBrakePads, rearBrakePads, brakeFluidDot4, brakeFluidDot5,
            engineOil5w40, engineOil10w60, coolant, sparkPlugs,
            airFilter, oilFilter, racingSuit, helmet,
            tireFrontLeft, tireFrontRight
        );
        await db.SaveChangesAsync();
        
        // === TEAM CARS ===
        var car1 = new TeamCar
        {
            CarNumber = "27",
            Nickname = "Blue Rocket",
            Make = "BMW",
            Model = "E36 M3",
            Year = 1996,
            CarClass = "Time Attack",
            Status = "Service",   // open brake & maintenance work orders
            OdometerKm = 120000,
            CreatedAt = DateTime.UtcNow
        };

        var car2 = new TeamCar
        {
            CarNumber = "11",
            Nickname = "Red Comet",
            Make = "Honda",
            Model = "Civic EK9",
            Year = 1999,
            CarClass = "Track Day",
            Status = "Service",   // in-progress wheel balance work order
            OdometerKm = 180000,
            CreatedAt = DateTime.UtcNow
        };

        var car3 = new TeamCar
        {
            CarNumber = "7",
            Nickname = "Silver Bullet",
            Make = "Mazda",
            Model = "RX-7 FD",
            Year = 1997,
            CarClass = "Drift",
            Status = "Service",
            OdometerKm = 95000,
            CreatedAt = DateTime.UtcNow.AddMonths(-2)
        };

        var car4 = new TeamCar
        {
            CarNumber = "99",
            Nickname = "White Lightning",
            Make = "Nissan",
            Model = "GT-R R35",
            Year = 2015,
            CarClass = "GT Class",
            Status = "Service",
            OdometerKm = 45000,
            CreatedAt = DateTime.UtcNow.AddMonths(-6)
        };

        var car5 = new TeamCar
        {
            CarNumber = "44",
            Nickname = "Yellow Hornet",
            Make = "Porsche",
            Model = "718 Cayman GT4",
            Year = 2022,
            CarClass = "GT4",
            Status = "Active",
            OdometerKm = 18500,
            CreatedAt = DateTime.UtcNow.AddMonths(-3)
        };

        db.TeamCars.AddRange(car1, car2, car3, car4, car5);

        await db.SaveChangesAsync(); 

        // CAR SESSIONS
        var session1 = new CarSession
        {
            TeamCarId = car1.Id,
            SessionType = "Practice",
            Date = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-14)),
            TrackName = "Serres Circuit",
            DriverUserId = driver.Id,
            Laps = 22,
            Notes = "Morning practice. Cool temps, good grip."
        };

        var session2 = new CarSession
        {
            TeamCarId = car1.Id,
            SessionType = "Qualifying",
            Date = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-13)),
            TrackName = "Serres Circuit",
            DriverUserId = driver.Id,
            Laps = 8,
            Notes = "Fast lap on 3rd attempt. P2 in class."
        };

        var session3 = new CarSession
        {
            TeamCarId = car1.Id,
            SessionType = "Race",
            Date = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-13)),
            TrackName = "Serres Circuit",
            DriverUserId = driver.Id,
            Laps = 15,
            Notes = "Good pace, brakes got soft near end. Finished P3."
        };

        var session4 = new CarSession
        {
            TeamCarId = car2.Id,
            SessionType = "Practice",
            Date = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-5)),
            TrackName = "Spa-Francorchamps",
            DriverUserId = driver.Id,
            Laps = 12,
            Notes = "Track day. Stable session, no major issues."
        };

        var session5 = new CarSession
        {
            TeamCarId = car2.Id,
            SessionType = "Testing",
            Date = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-2)),
            TrackName = "Nurburgring GP",
            DriverUserId = driver.Id,
            Laps = 20,
            Notes = "Testing new suspension setup. Good improvement in cornering."
        };

        var session6 = new CarSession
        {
            TeamCarId = car3.Id,
            SessionType = "Practice",
            Date = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30)),
            TrackName = "Tsukuba Circuit",
            DriverUserId = driver.Id,
            Laps = 15,
            Notes = "Engine running hot. Needs inspection."
        };

        var session7 = new CarSession
        {
            TeamCarId = car4.Id,
            SessionType = "Qualifying",
            Date = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-21)),
            TrackName = "Circuit de Barcelona-Catalunya",
            DriverUserId = driver.Id,
            Laps = 10,
            Notes = "Perfect conditions. New PB by 2 seconds."
        };

        var session8 = new CarSession
        {
            TeamCarId = car4.Id,
            SessionType = "Race",
            Date = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-21)),
            TrackName = "Circuit de Barcelona-Catalunya",
            DriverUserId = driver.Id,
            Laps = 25,
            Notes = "Clean race. Won the class!"
        };

        var session9 = new CarSession
        {
            TeamCarId = car5.Id,
            SessionType = "Practice",
            Date = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-10)),
            TrackName = "Autodromo di Monza",
            DriverUserId = driver.Id,
            Laps = 18,
            Notes = "Shake-down after winter storage. Car felt great, no issues."
        };

        var session10 = new CarSession
        {
            TeamCarId = car5.Id,
            SessionType = "Race",
            Date = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-3)),
            TrackName = "Autodromo di Monza",
            DriverUserId = driver.Id,
            Laps = 30,
            Notes = "Podium finish. Car fully reliable throughout, zero mechanical concerns."
        };

        db.CarSessions.AddRange(session1, session2, session3, session4, session5, session6, session7, session8, session9, session10);
        await db.SaveChangesAsync();
        
        // ISSUE REPORTS
        var issue1 = new IssueReport
        {
            TeamCarId = car1.Id,
            CarSessionId = session3.Id,
            ReportedByUserId = driver.Id,
            Title = "Brake pedal feels soft",
            Description = "After lap 12, pedal travel increased significantly. Possible air in brake lines or pad wear.",
            Severity = "High",
            Status = "Open",
            ReportedAt = DateTime.UtcNow.AddDays(-13)
        };

        var issue2 = new IssueReport
        {
            TeamCarId = car2.Id,
            CarSessionId = session4.Id,
            ReportedByUserId = driver.Id,
            Title = "Slight vibration at high speed",
            Description = "Noticeable at 140+ km/h on straights. Could be wheel balance or tire issue.",
            Severity = "Medium",
            Status = "Open",
            ReportedAt = DateTime.UtcNow.AddDays(-5)
        };

        var issue3 = new IssueReport
        {
            TeamCarId = car3.Id,
            CarSessionId = session6.Id,
            ReportedByUserId = driver.Id,
            Title = "Engine overheating",
            Description = "Temperature gauge hitting red zone after 10 laps. Coolant system needs full inspection.",
            Severity = "High",
            Status = "Open",
            ReportedAt = DateTime.UtcNow.AddDays(-30)
        };

        var issue4 = new IssueReport
        {
            TeamCarId = car1.Id,
            CarSessionId = session1.Id,
            ReportedByUserId = driver.Id,
            Title = "Gear shift feels notchy",
            Description = "Especially 2nd to 3rd gear. May need transmission fluid change.",
            Severity = "Low",
            Status = "Open",
            ReportedAt = DateTime.UtcNow.AddDays(-14)
        };

        var issue5 = new IssueReport
        {
            TeamCarId = car2.Id,
            CarSessionId = session5.Id,
            ReportedByUserId = driver.Id,
            Title = "Exhaust noise increased",
            Description = "Louder than usual. Possible exhaust leak or loose mount.",
            Severity = "Low",
            Status = "Open",
            ReportedAt = DateTime.UtcNow.AddDays(-2)
        };

        var issue6 = new IssueReport
        {
            TeamCarId = car4.Id,
            CarSessionId = session7.Id,
            ReportedByUserId = driver.Id,
            Title = "ABS light flashing",
            Description = "Intermittent ABS warning light during hard braking.",
            Severity = "Medium",
            Status = "Open",
            ReportedAt = DateTime.UtcNow.AddDays(-21)
        };

        db.IssueReports.AddRange(issue1, issue2, issue3, issue4, issue5, issue6);
        await db.SaveChangesAsync();
        
        // WORK ORDERS
        var wo1 = new WorkOrder
        {
            TeamCarId = car1.Id,
            CreatedByUserId = manager.Id,
            AssignedToUserId = mechanic.Id,
            CarSessionId = session3.Id,
            Title = "Brake system inspection and overhaul",
            Description = "Full brake system check: bleed all lines, inspect pads and discs, check for leaks.",
            Priority = "High",
            Status = "Open",
            CreatedAt = DateTime.UtcNow.AddDays(-12),
            DueDate = DateTime.UtcNow.AddDays(2)
        };

        var wo2 = new WorkOrder
        {
            TeamCarId = car2.Id,
            CreatedByUserId = manager.Id,
            AssignedToUserId = mechanic.Id,
            CarSessionId = session4.Id,
            Title = "Wheel balance and alignment",
            Description = "Balance all wheels, check alignment, inspect tires for uneven wear.",
            Priority = "Medium",
            Status = "In Progress",
            CreatedAt = DateTime.UtcNow.AddDays(-4),
            DueDate = DateTime.UtcNow.AddDays(7)
        };

        var wo3 = new WorkOrder
        {
            TeamCarId = car3.Id,
            CreatedByUserId = manager.Id,
            AssignedToUserId = mechanic.Id,
            CarSessionId = session6.Id,
            Title = "Cooling system repair",
            Description = "Diagnose overheating issue. Check radiator, water pump, thermostat, and all hoses.",
            Priority = "High",
            Status = "Open",
            CreatedAt = DateTime.UtcNow.AddDays(-29),
            DueDate = DateTime.UtcNow.AddDays(1)
        };

        var wo4 = new WorkOrder
        {
            TeamCarId = car1.Id,
            CreatedByUserId = manager.Id,
            AssignedToUserId = mechanic.Id,
            CarSessionId = null,
            Title = "Regular maintenance service",
            Description = "Oil change, filter replacement, general inspection.",
            Priority = "Low",
            Status = "Open",
            CreatedAt = DateTime.UtcNow.AddDays(-10),
            DueDate = DateTime.UtcNow.AddDays(5)
        };

        var wo5 = new WorkOrder
        {
            TeamCarId = car4.Id,
            CreatedByUserId = manager.Id,
            AssignedToUserId = null,
            CarSessionId = session7.Id,
            Title = "ABS sensor diagnostics",
            Description = "Check all ABS sensors, wiring, and ECU for fault codes.",
            Priority = "Medium",
            Status = "Open",
            CreatedAt = DateTime.UtcNow.AddDays(-20),
            DueDate = DateTime.UtcNow.AddDays(10)
        };

        db.WorkOrders.AddRange(wo1, wo2, wo3, wo4, wo5);
        await db.SaveChangesAsync();
        
        // Link issues to work orders
        issue1.LinkedWorkOrderId = wo1.Id;
        issue1.Status = "Linked";
        
        issue2.LinkedWorkOrderId = wo2.Id;
        issue2.Status = "Linked";
        
        issue3.LinkedWorkOrderId = wo3.Id;
        issue3.Status = "Linked";
        
        issue6.LinkedWorkOrderId = wo5.Id;
        issue6.Status = "Linked";
        
        // WORK ORDER TASKS
        var t1 = new WorkOrderTask
        {
            WorkOrderId = wo1.Id,
            Title = "Bleed brake system",
            Description = "Bleed all four corners, starting from furthest from master cylinder",
            Status = "Todo",
            SortOrder = 1,
            EstimatedMinutes = 45
        };

        var t2 = new WorkOrderTask
        {
            WorkOrderId = wo1.Id,
            Title = "Inspect brake pads",
            Description = "Check pad thickness and wear pattern, measure with caliper",
            Status = "Todo",
            SortOrder = 2,
            EstimatedMinutes = 20
        };

        var t3 = new WorkOrderTask
        {
            WorkOrderId = wo1.Id,
            Title = "Check brake discs",
            Description = "Inspect for warping, cracks, and minimum thickness",
            Status = "Todo",
            SortOrder = 3,
            EstimatedMinutes = 15
        };

        var t4 = new WorkOrderTask
        {
            WorkOrderId = wo2.Id,
            Title = "Balance all wheels",
            Description = "Use balancing machine, check for bent rims",
            Status = "Todo",
            SortOrder = 1,
            EstimatedMinutes = 60
        };

        var t5 = new WorkOrderTask
        {
            WorkOrderId = wo2.Id,
            Title = "Four-wheel alignment",
            Description = "Set camber, caster, and toe to spec",
            Status = "Todo",
            SortOrder = 2,
            EstimatedMinutes = 90
        };

        var t6 = new WorkOrderTask
        {
            WorkOrderId = wo3.Id,
            Title = "Pressure test cooling system",
            Description = "Check for leaks under pressure",
            Status = "Todo",
            SortOrder = 1,
            EstimatedMinutes = 30
        };

        var t7 = new WorkOrderTask
        {
            WorkOrderId = wo3.Id,
            Title = "Inspect water pump",
            Description = "Check for bearing noise and seal leaks",
            Status = "Todo",
            SortOrder = 2,
            EstimatedMinutes = 45
        };

        var t8 = new WorkOrderTask
        {
            WorkOrderId = wo3.Id,
            Title = "Replace thermostat",
            Description = "Install new thermostat and gasket",
            Status = "Todo",
            SortOrder = 3,
            EstimatedMinutes = 60
        };

        var t9 = new WorkOrderTask
        {
            WorkOrderId = wo4.Id,
            Title = "Oil and filter change",
            Description = "Drain old oil, replace filter, refill with 5W-40",
            Status = "Todo",
            SortOrder = 1,
            EstimatedMinutes = 30
        };

        var t10 = new WorkOrderTask
        {
            WorkOrderId = wo4.Id,
            Title = "Replace air filter",
            Description = "Install new high-flow air filter",
            Status = "Todo",
            SortOrder = 2,
            EstimatedMinutes = 10
        };

        var t11 = new WorkOrderTask
        {
            WorkOrderId = wo5.Id,
            Title = "Scan ABS system",
            Description = "Read fault codes from ABS ECU",
            Status = "Todo",
            SortOrder = 1,
            EstimatedMinutes = 20
        };

        var t12 = new WorkOrderTask
        {
            WorkOrderId = wo5.Id,
            Title = "Test ABS sensors",
            Description = "Check resistance and signal output from all four sensors",
            Status = "Todo",
            SortOrder = 2,
            EstimatedMinutes = 40
        };

        db.WorkOrderTasks.AddRange(t1, t2, t3, t4, t5, t6, t7, t8, t9, t10, t11, t12);
        await db.SaveChangesAsync();

        // LABOR LOGS
        var labor1 = new LaborLog
        {
            WorkOrderTaskId = t1.Id,
            MechanicUserId = mechanic.Id,
            Minutes = 50,
            LogDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-11)),
            Comment = "Completed brake bleeding on all four corners. Pedal feels much firmer now."
        };

        var labor2 = new LaborLog
        {
            WorkOrderTaskId = t2.Id,
            MechanicUserId = mechanic.Id,
            Minutes = 25,
            LogDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-11)),
            Comment = "Front pads at 4mm, rears at 6mm. Within acceptable range but should monitor."
        };

        var labor3 = new LaborLog
        {
            WorkOrderTaskId = t4.Id,
            MechanicUserId = mechanic.Id,
            Minutes = 65,
            LogDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-3)),
            Comment = "All wheels balanced successfully. FL had significant weight imbalance."
        };

        var labor4 = new LaborLog
        {
            WorkOrderTaskId = t9.Id,
            MechanicUserId = mechanic.Id,
            Minutes = 28,
            LogDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-9)),
            Comment = "Oil change completed. Used Motul 5W-40. Filter replaced."
        };

        db.LaborLogs.AddRange(labor1, labor2, labor3, labor4);
        await db.SaveChangesAsync();
        
        // INVENTORY STOCK & MOVEMENTS
        await using var tx = await db.Database.BeginTransactionAsync();
        
        // Initial stock - Main Garage
        db.InventoryStock.AddRange(
            new InventoryStock
            {
                PartId = frontBrakePads.Id,
                InventoryLocationId = mainGarage.Id,
                Quantity = 4,
                UpdatedAt = DateTime.UtcNow.AddDays(-30)
            },
            new InventoryStock
            {
                PartId = rearBrakePads.Id,
                InventoryLocationId = mainGarage.Id,
                Quantity = 3,
                UpdatedAt = DateTime.UtcNow.AddDays(-30)
            },
            new InventoryStock
            {
                PartId = brakeFluidDot4.Id,
                InventoryLocationId = mainGarage.Id,
                Quantity = 8,
                UpdatedAt = DateTime.UtcNow.AddDays(-30)
            },
            new InventoryStock
            {
                PartId = brakeFluidDot5.Id,
                InventoryLocationId = mainGarage.Id,
                Quantity = 5,
                UpdatedAt = DateTime.UtcNow.AddDays(-30)
            },
            new InventoryStock
            {
                PartId = engineOil5w40.Id,
                InventoryLocationId = mainGarage.Id,
                Quantity = 15,
                UpdatedAt = DateTime.UtcNow.AddDays(-30)
            },
            new InventoryStock
            {
                PartId = engineOil10w60.Id,
                InventoryLocationId = mainGarage.Id,
                Quantity = 10,
                UpdatedAt = DateTime.UtcNow.AddDays(-30)
            },
            new InventoryStock
            {
                PartId = coolant.Id,
                InventoryLocationId = mainGarage.Id,
                Quantity = 4,
                UpdatedAt = DateTime.UtcNow.AddDays(-30)
            },
            new InventoryStock
            {
                PartId = sparkPlugs.Id,
                InventoryLocationId = mainGarage.Id,
                Quantity = 3,
                UpdatedAt = DateTime.UtcNow.AddDays(-30)
            },
            new InventoryStock
            {
                PartId = airFilter.Id,
                InventoryLocationId = mainGarage.Id,
                Quantity = 5,
                UpdatedAt = DateTime.UtcNow.AddDays(-30)
            },
            new InventoryStock
            {
                PartId = oilFilter.Id,
                InventoryLocationId = mainGarage.Id,
                Quantity = 12,
                UpdatedAt = DateTime.UtcNow.AddDays(-30)
            },
            new InventoryStock
            {
                PartId = tireFrontLeft.Id,
                InventoryLocationId = mainGarage.Id,
                Quantity = 4,
                UpdatedAt = DateTime.UtcNow.AddDays(-30)
            },
            new InventoryStock
            {
                PartId = tireFrontRight.Id,
                InventoryLocationId = mainGarage.Id,
                Quantity = 4,
                UpdatedAt = DateTime.UtcNow.AddDays(-30)
            }
        );

        // Track Box stock
        db.InventoryStock.AddRange(
            new InventoryStock
            {
                PartId = brakeFluidDot4.Id,
                InventoryLocationId = trackBox.Id,
                Quantity = 2,
                UpdatedAt = DateTime.UtcNow.AddDays(-25)
            },
            new InventoryStock
            {
                PartId = engineOil5w40.Id,
                InventoryLocationId = trackBox.Id,
                Quantity = 6,
                UpdatedAt = DateTime.UtcNow.AddDays(-25)
            },
            new InventoryStock
            {
                PartId = coolant.Id,
                InventoryLocationId = trackBox.Id,
                Quantity = 2,
                UpdatedAt = DateTime.UtcNow.AddDays(-25)
            }
        );

        // Warehouse bulk storage
        db.InventoryStock.AddRange(
            new InventoryStock
            {
                PartId = engineOil5w40.Id,
                InventoryLocationId = warehouse.Id,
                Quantity = 30,
                UpdatedAt = DateTime.UtcNow.AddDays(-20)
            },
            new InventoryStock
            {
                PartId = engineOil10w60.Id,
                InventoryLocationId = warehouse.Id,
                Quantity = 20,
                UpdatedAt = DateTime.UtcNow.AddDays(-20)
            },
            new InventoryStock
            {
                PartId = coolant.Id,
                InventoryLocationId = warehouse.Id,
                Quantity = 15,
                UpdatedAt = DateTime.UtcNow.AddDays(-20)
            }
        );

        await db.SaveChangesAsync();

        // Initial receive movements
        db.InventoryMovements.AddRange(
            new InventoryMovement
            {
                PartId = frontBrakePads.Id,
                InventoryLocationId = mainGarage.Id,
                QuantityChange = 4,
                Reason = "Receive",
                WorkOrderId = null,
                PerformedByUserId = partsClerk.Id,
                Notes = "Initial stock delivery from Brembo",
                PerformedAt = DateTime.UtcNow.AddDays(-30)
            },
            new InventoryMovement
            {
                PartId = rearBrakePads.Id,
                InventoryLocationId = mainGarage.Id,
                QuantityChange = 3,
                Reason = "Receive",
                WorkOrderId = null,
                PerformedByUserId = partsClerk.Id,
                Notes = "Initial stock delivery from Brembo",
                PerformedAt = DateTime.UtcNow.AddDays(-30)
            },
            new InventoryMovement
            {
                PartId = brakeFluidDot4.Id,
                InventoryLocationId = mainGarage.Id,
                QuantityChange = 8,
                Reason = "Receive",
                WorkOrderId = null,
                PerformedByUserId = partsClerk.Id,
                Notes = "Initial stock delivery from Motul",
                PerformedAt = DateTime.UtcNow.AddDays(-30)
            },
            new InventoryMovement
            {
                PartId = engineOil5w40.Id,
                InventoryLocationId = mainGarage.Id,
                QuantityChange = 15,
                Reason = "Receive",
                WorkOrderId = null,
                PerformedByUserId = partsClerk.Id,
                Notes = "Initial stock delivery from Motul",
                PerformedAt = DateTime.UtcNow.AddDays(-30)
            },
            new InventoryMovement
            {
                PartId = oilFilter.Id,
                InventoryLocationId = mainGarage.Id,
                QuantityChange = 12,
                Reason = "Receive",
                WorkOrderId = null,
                PerformedByUserId = partsClerk.Id,
                Notes = "Initial stock delivery",
                PerformedAt = DateTime.UtcNow.AddDays(-30)
            },
            new InventoryMovement
            {
                PartId = engineOil5w40.Id,
                InventoryLocationId = warehouse.Id,
                QuantityChange = 30,
                Reason = "Receive",
                WorkOrderId = null,
                PerformedByUserId = partsClerk.Id,
                Notes = "Bulk order - stored in warehouse",
                PerformedAt = DateTime.UtcNow.AddDays(-20)
            }
        );

        await db.SaveChangesAsync();

        // Example: Parts used in Work Order 4 (oil change)
        var oilStockMain = await db.InventoryStock
            .FirstAsync(s => s.PartId == engineOil5w40.Id && s.InventoryLocationId == mainGarage.Id);
        var filterStockMain = await db.InventoryStock
            .FirstAsync(s => s.PartId == oilFilter.Id && s.InventoryLocationId == mainGarage.Id);

        oilStockMain.Quantity -= 5; // 5 liters used
        oilStockMain.UpdatedAt = DateTime.UtcNow.AddDays(-9);
        
        filterStockMain.Quantity -= 1;
        filterStockMain.UpdatedAt = DateTime.UtcNow.AddDays(-9);

        db.InventoryMovements.AddRange(
            new InventoryMovement
            {
                PartId = engineOil5w40.Id,
                InventoryLocationId = mainGarage.Id,
                QuantityChange = -5,
                Reason = "Install",
                WorkOrderId = wo4.Id,
                PerformedByUserId = mechanic.Id,
                Notes = "Oil change for BMW E36 M3",
                PerformedAt = DateTime.UtcNow.AddDays(-9)
            },
            new InventoryMovement
            {
                PartId = oilFilter.Id,
                InventoryLocationId = mainGarage.Id,
                QuantityChange = -1,
                Reason = "Install",
                WorkOrderId = wo4.Id,
                PerformedByUserId = mechanic.Id,
                Notes = "Oil filter replacement for BMW E36 M3",
                PerformedAt = DateTime.UtcNow.AddDays(-9)
            }
        );

        db.PartInstallations.AddRange(
            new PartInstallation
            {
                WorkOrderId = wo4.Id,
                PartId = engineOil5w40.Id,
                InventoryLocationId = mainGarage.Id,
                Quantity = 5,
                InstalledByUserId = mechanic.Id,
                InstalledAt = DateTime.UtcNow.AddDays(-9),
                Notes = "Engine oil change"
            },
            new PartInstallation
            {
                WorkOrderId = wo4.Id,
                PartId = oilFilter.Id,
                InventoryLocationId = mainGarage.Id,
                Quantity = 1,
                InstalledByUserId = mechanic.Id,
                InstalledAt = DateTime.UtcNow.AddDays(-9),
                Notes = "Oil filter replacement"
            }
        );

        await db.SaveChangesAsync();
        await tx.CommitAsync();
    }

    private static string HashPassword(AppUser user, string password)
    {
        var hasher = new PasswordHasher<AppUser>();
        return hasher.HashPassword(user, password);
    }
}