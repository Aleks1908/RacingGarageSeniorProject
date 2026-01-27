using Microsoft.EntityFrameworkCore;
using RacingGarage.Models;

namespace RacingGarage.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<AppUser> Users => Set<AppUser>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<TeamCar> TeamCars => Set<TeamCar>();
    public DbSet<CarComponent> CarComponents => Set<CarComponent>();
    public DbSet<CarSession> CarSessions => Set<CarSession>();
    public DbSet<WorkOrder> WorkOrders => Set<WorkOrder>();
    public DbSet<WorkOrderTask> WorkOrderTasks => Set<WorkOrderTask>();
    public DbSet<LaborLog> LaborLogs => Set<LaborLog>();
    public DbSet<IssueReport> IssueReports => Set<IssueReport>();
    public DbSet<Supplier> Suppliers => Set<Supplier>();
    
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<AppUser>()
            .HasIndex(u => u.Email)
            .IsUnique();

        modelBuilder.Entity<UserRole>()
            .HasKey(ur => new { ur.UserId, ur.RoleId });

        modelBuilder.Entity<UserRole>()
            .HasOne(ur => ur.User)
            .WithMany(u => u.UserRoles)
            .HasForeignKey(ur => ur.UserId);

        modelBuilder.Entity<UserRole>()
            .HasOne(ur => ur.Role)
            .WithMany(r => r.UserRoles)
            .HasForeignKey(ur => ur.RoleId);
        
        modelBuilder.Entity<TeamCar>()
            .HasIndex(c => c.CarNumber)
            .IsUnique();

        modelBuilder.Entity<CarSession>()
            .HasOne(s => s.DriverUser)
            .WithMany()
            .HasForeignKey(s => s.DriverUserId)
            .OnDelete(DeleteBehavior.SetNull);
        
        modelBuilder.Entity<WorkOrder>()
            .HasOne(w => w.CreatedByUser)
            .WithMany()
            .HasForeignKey(w => w.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<WorkOrder>()
            .HasOne(w => w.AssignedToUser)
            .WithMany()
            .HasForeignKey(w => w.AssignedToUserId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<WorkOrder>()
            .HasOne(w => w.CarSession)
            .WithMany()
            .HasForeignKey(w => w.CarSessionId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<LaborLog>()
            .HasOne(l => l.MechanicUser)
            .WithMany()
            .HasForeignKey(l => l.MechanicUserId)
            .OnDelete(DeleteBehavior.Restrict);
        
        modelBuilder.Entity<IssueReport>()
            .HasOne(i => i.ReportedByUser)
            .WithMany()
            .HasForeignKey(i => i.ReportedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<IssueReport>()
            .HasOne(i => i.CarSession)
            .WithMany()
            .HasForeignKey(i => i.CarSessionId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<IssueReport>()
            .HasOne(i => i.LinkedWorkOrder)
            .WithMany()
            .HasForeignKey(i => i.LinkedWorkOrderId)
            .OnDelete(DeleteBehavior.SetNull);
        
        modelBuilder.Entity<Supplier>()
            .HasIndex(s => s.Name)
            .IsUnique();
        
    }
}