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
        
        var roles = await db.Roles.ToDictionaryAsync(r => r.Name, r => r.Id);
        
        
        var manager = new AppUser { Name = "Test Manager", Email = "manager@test.com" };
        manager.PasswordHash = HashPassword(manager, "Manager123!");
        
        var mechanic = new AppUser { Name = "Test Mechanic", Email = "mechanic@test.com" };
        manager.PasswordHash = HashPassword(manager, "" + "Mechanic123!");
        
        var driver = new AppUser { Name = "Test Driver", Email = "driver@test.com" };
        manager.PasswordHash = HashPassword(manager, "Driver123!");
        
        var parts = new AppUser { Name = "Test Parts", Email = "parts@test.com" };
        manager.PasswordHash = HashPassword(manager, "Parts123!");

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
    

    private static string HashPassword(AppUser user, string password)
    {
        var hasher = new PasswordHasher<AppUser>();
        return hasher.HashPassword(user, password);
    }
}