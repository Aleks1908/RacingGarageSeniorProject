using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using RacingGarage.Data;
using RacingGarage.dto;
using RacingGarage.Models;
using Xunit;

namespace RacingGarage.Tests.IssueReports;

public class IssueReportsApiTests : IClassFixture<TestAppFactory>
{
    private readonly TestAppFactory _factory;

    public IssueReportsApiTests(TestAppFactory factory) => _factory = factory;

    private static string U(string prefix) => $"{prefix}-{Guid.NewGuid():N}".ToUpperInvariant();

    private async Task<int> EnsureRoleAsync(string roleName)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var existing = await db.Roles.FirstOrDefaultAsync(r => r.Name == roleName);
        if (existing != null) return existing.Id;

        var r = new Role { Name = roleName };
        db.Roles.Add(r);
        await db.SaveChangesAsync();
        return r.Id;
    }

    private async Task<int> SeedUserAsync(string roleName, string? name = null)
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
            CarNumber = carNumber ?? U("CAR"),
            Status = status
        };

        db.TeamCars.Add(car);
        await db.SaveChangesAsync();
        return car.Id;
    }

    private async Task<int> SeedWorkOrderAsync(int teamCarId, int createdByUserId, string status = "Open")
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var workOrder = new WorkOrder
        {
            TeamCarId = teamCarId,
            CreatedByUserId = createdByUserId,
            AssignedToUserId = null,
            CarSessionId = null,
            Title = "WO " + U("T"),
            Description = "",
            Priority = "Medium",
            Status = status,
            CreatedAt = DateTime.UtcNow,
            DueDate = null,
            ClosedAt = null
        };

        db.WorkOrders.Add(workOrder);
        await db.SaveChangesAsync();
        return workOrder.Id;
    }

    private async Task<int> SeedIssueAsync(
        int teamCarId,
        int reportedByUserId,
        string status = "Open",
        string severity = "Medium",
        int? linkedWorkOrderId = null)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var issue = new IssueReport
        {
            TeamCarId = teamCarId,
            CarSessionId = null,
            ReportedByUserId = reportedByUserId,
            LinkedWorkOrderId = linkedWorkOrderId,
            Title = "Issue " + U("I"),
            Description = "",
            Severity = severity,
            Status = status,
            ReportedAt = DateTime.UtcNow,
            ClosedAt = null
        };

        db.IssueReports.Add(issue);
        await db.SaveChangesAsync();
        return issue.Id;
    }

    [Fact]
    public async Task GetAll_returns_200_for_manager_and_allows_filters()
    {
        var mgrId = await SeedUserAsync("Manager");
        var carId = await SeedTeamCarAsync();

        var driver1 = await SeedUserAsync("Driver");
        var driver2 = await SeedUserAsync("Driver");

        await SeedIssueAsync(carId, driver1, status: "Open", severity: "High");
        await SeedIssueAsync(carId, driver2, status: "Closed", severity: "Low");

        var client = _factory.CreateClient().AsUser(userId: mgrId, roles: "Manager");

        var res = await client.GetAsync($"/api/issue-reports?teamCarId={carId}&status=Open&severity=High");

        res.StatusCode.Should().Be(HttpStatusCode.OK);

        var list = await res.Content.ReadFromJsonAsync<List<IssueReportReadDto>>();
        list.Should().NotBeNull();
        list!.Count.Should().Be(1);
        list[0].TeamCarId.Should().Be(carId);
        list[0].Status.Should().Be("Open");
        list[0].Severity.Should().Be("High");
    }

    [Fact]
    public async Task GetAll_driver_can_filter_by_reportedByUserId()
    {
        var driver1 = await SeedUserAsync("Driver");
        var driver2 = await SeedUserAsync("Driver");
        var carId = await SeedTeamCarAsync();

        var own = await SeedIssueAsync(carId, driver1, severity: "High");
        await SeedIssueAsync(carId, driver2, severity: "High");

        var client = _factory.CreateClient().AsUser(userId: driver1, roles: "Driver");

        var res = await client.GetAsync($"/api/issue-reports?severity=High&reportedByUserId={driver1}");

        res.StatusCode.Should().Be(HttpStatusCode.OK);

        var list = await res.Content.ReadFromJsonAsync<List<IssueReportReadDto>>();
        list.Should().NotBeNull();

        list!.Select(x => x.Id).Should().Contain(own);
        list.All(x => x.ReportedByUserId == driver1).Should().BeTrue();
    }

    [Fact]
    public async Task GetAll_driver_returns_all_matching_issues_when_reportedByUserId_not_provided()
    {
        var driver1 = await SeedUserAsync("Driver");
        var driver2 = await SeedUserAsync("Driver");
        var carId = await SeedTeamCarAsync();

        var issue1 = await SeedIssueAsync(carId, driver1, severity: "High");
        var issue2 = await SeedIssueAsync(carId, driver2, severity: "High");

        var client = _factory.CreateClient().AsUser(userId: driver1, roles: "Driver");

        var res = await client.GetAsync("/api/issue-reports?severity=High");

        res.StatusCode.Should().Be(HttpStatusCode.OK);

        var list = await res.Content.ReadFromJsonAsync<List<IssueReportReadDto>>();
        list.Should().NotBeNull();

        list!.Select(x => x.Id).Should().Contain(new[] { issue1, issue2 });
        list.All(x => x.Severity == "High").Should().BeTrue();
    }

    [Fact]
    public async Task GetById_returns_404_when_missing()
    {
        var mgrId = await SeedUserAsync("Manager");
        var client = _factory.CreateClient().AsUser(userId: mgrId, roles: "Manager");

        var res = await client.GetAsync("/api/issue-reports/999999");
        res.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetById_driver_cannot_read_other_users_issue()
    {
        var driver1 = await SeedUserAsync("Driver");
        var driver2 = await SeedUserAsync("Driver");
        var carId = await SeedTeamCarAsync();

        var issueId = await SeedIssueAsync(carId, driver2);

        var client = _factory.CreateClient().AsUser(userId: driver1, roles: "Driver");

        var res = await client.GetAsync($"/api/issue-reports/{issueId}");

        res.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task GetById_manager_can_read_any_issue()
    {
        var mgrId = await SeedUserAsync("Manager");
        var driver = await SeedUserAsync("Driver");
        var carId = await SeedTeamCarAsync();

        var issueId = await SeedIssueAsync(carId, driver);

        var client = _factory.CreateClient().AsUser(userId: mgrId, roles: "Manager");

        var res = await client.GetAsync($"/api/issue-reports/{issueId}");

        res.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Create_requires_auth()
    {
        var res = await _factory.CreateClient().AsAnonymous()
            .PostAsJsonAsync("/api/issue-reports", new { });

        res.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Create_requires_role()
    {
        var mechId = await SeedUserAsync("Mechanic");
        var carId = await SeedTeamCarAsync();

        var client = _factory.CreateClient().AsUser(userId: mechId, roles: "Mechanic");

        var res = await client.PostAsJsonAsync("/api/issue-reports", new
        {
            teamCarId = carId,
            title = "Issue"
        });

        res.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Create_valid_defaults_status_and_severity()
    {
        var driverId = await SeedUserAsync("Driver");
        var carId = await SeedTeamCarAsync();

        var client = _factory.CreateClient().AsUser(userId: driverId, roles: "Driver");

        var res = await client.PostAsJsonAsync("/api/issue-reports", new
        {
            teamCarId = carId,
            title = "  Brake vibration  "
        });

        res.StatusCode.Should().Be(HttpStatusCode.Created);

        var body = await res.Content.ReadFromJsonAsync<IssueReportReadDto>();
        body.Should().NotBeNull();
        body!.Status.Should().Be("Open");
        body.Severity.Should().Be("Medium");
        body.ReportedByUserId.Should().Be(driverId);
        body.TeamCarId.Should().Be(carId);
    }

    [Fact]
    public async Task Create_returns_400_when_teamCar_missing()
    {
        var driverId = await SeedUserAsync("Driver");
        var client = _factory.CreateClient().AsUser(userId: driverId, roles: "Driver");

        var res = await client.PostAsJsonAsync("/api/issue-reports", new
        {
            teamCarId = 999999,
            title = "Issue"
        });

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Update_returns_404_when_missing()
    {
        var driverId = await SeedUserAsync("Driver");
        var carId = await SeedTeamCarAsync();

        var client = _factory.CreateClient().AsUser(userId: driverId, roles: "Driver");

        var res = await client.PutAsJsonAsync("/api/issue-reports/999999", new
        {
            teamCarId = carId,
            title = "Updated"
        });

        res.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Update_driver_cannot_update_other_users_issue()
    {
        var driver1 = await SeedUserAsync("Driver");
        var driver2 = await SeedUserAsync("Driver");
        var carId = await SeedTeamCarAsync();

        var issueId = await SeedIssueAsync(carId, driver2);

        var client = _factory.CreateClient().AsUser(userId: driver1, roles: "Driver");

        var res = await client.PutAsJsonAsync($"/api/issue-reports/{issueId}", new
        {
            teamCarId = carId,
            title = "Nope",
            severity = "High",
            status = "Open"
        });

        res.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Update_unlinks_work_order_when_linkedWorkOrderId_null_and_sets_open()
    {
        var mgrId = await SeedUserAsync("Manager");
        var driverId = await SeedUserAsync("Driver");
        var carId = await SeedTeamCarAsync();

        var workOrderId = await SeedWorkOrderAsync(carId, createdByUserId: driverId, status: "Open");
        var issueId = await SeedIssueAsync(carId, driverId, status: "Linked", linkedWorkOrderId: workOrderId);


        var client = _factory.CreateClient().AsUser(userId: mgrId, roles: "Manager");

        var res = await client.PutAsJsonAsync($"/api/issue-reports/{issueId}", new
        {
            teamCarId = carId,
            title = "Updated",
            linkedWorkOrderId = (int?)null
        });

        res.StatusCode.Should().Be(HttpStatusCode.NoContent);

        using var scope2 = _factory.Services.CreateScope();
        var db2 = scope2.ServiceProvider.GetRequiredService<AppDbContext>();

        var issue = await db2.IssueReports.FirstAsync(i => i.Id == issueId);
        issue.LinkedWorkOrderId.Should().BeNull();
        issue.Status.Should().Be("Open");
        issue.ClosedAt.Should().BeNull();
    }

    [Fact]
    public async Task LinkWorkOrder_requires_role()
    {
        var driverId = await SeedUserAsync("Driver");
        var carId = await SeedTeamCarAsync();
        var issueId = await SeedIssueAsync(carId, driverId);

        var client = _factory.CreateClient().AsUser(userId: driverId, roles: "Driver");

        var res = await client.PostAsJsonAsync($"/api/issue-reports/{issueId}/link-work-order", new
        {
            linkedWorkOrderId = 1
        });

        res.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task LinkWorkOrder_links_issue_and_sets_status_linked_when_wo_open()
    {
        var mechId = await SeedUserAsync("Mechanic");
        var driverId = await SeedUserAsync("Driver");
        var carId = await SeedTeamCarAsync();

        var issueId = await SeedIssueAsync(carId, driverId, status: "Open");
        var workOrderId = await SeedWorkOrderAsync(carId, createdByUserId: driverId, status: "Open");

        var client = _factory.CreateClient().AsUser(userId: mechId, roles: "Mechanic");

        var res = await client.PostAsJsonAsync($"/api/issue-reports/{issueId}/link-work-order", new
        {
            linkedWorkOrderId = workOrderId
        });

        res.StatusCode.Should().Be(HttpStatusCode.NoContent);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var issue = await db.IssueReports.FirstAsync(i => i.Id == issueId);

        issue.LinkedWorkOrderId.Should().Be(workOrderId);

        issue.Status.Should().Be("Linked");
        issue.ClosedAt.Should().BeNull();
    }

    [Fact]
    public async Task LinkWorkOrder_sets_issue_closed_when_wo_closed()
    {
        var mgrId = await SeedUserAsync("Manager");
        var driverId = await SeedUserAsync("Driver");
        var carId = await SeedTeamCarAsync();

        var issueId = await SeedIssueAsync(carId, driverId, status: "Open");
        var workOrderId = await SeedWorkOrderAsync(carId, createdByUserId: driverId, status: "Closed");

        var client = _factory.CreateClient().AsUser(userId: mgrId, roles: "Manager");

        var res = await client.PostAsJsonAsync($"/api/issue-reports/{issueId}/link-work-order", new
        {
            linkedWorkOrderId = workOrderId
        });

        res.StatusCode.Should().Be(HttpStatusCode.NoContent);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var issue = await db.IssueReports.FirstAsync(i => i.Id == issueId);
        issue.Status.Should().Be("Closed");
        issue.ClosedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task LinkWorkOrder_unlinks_other_issues_from_same_work_order()
    {
        var mgrId = await SeedUserAsync("Manager");
        var driverId = await SeedUserAsync("Driver");
        var carId = await SeedTeamCarAsync();

        var workOrderId = await SeedWorkOrderAsync(carId, createdByUserId: driverId, status: "Open");

        var issueA = await SeedIssueAsync(carId, driverId, status: "Linked", linkedWorkOrderId: workOrderId);

        var issueB = await SeedIssueAsync(carId, driverId, status: "Open");

        var client = _factory.CreateClient().AsUser(userId: mgrId, roles: "Manager");

        var res = await client.PostAsJsonAsync($"/api/issue-reports/{issueB}/link-work-order", new
        {
            linkedWorkOrderId = workOrderId
        });

        res.StatusCode.Should().Be(HttpStatusCode.NoContent);

        using var scope2 = _factory.Services.CreateScope();
        var db2 = scope2.ServiceProvider.GetRequiredService<AppDbContext>();

        var a = await db2.IssueReports.FirstAsync(i => i.Id == issueA);
        var b = await db2.IssueReports.FirstAsync(i => i.Id == issueB);

        a.LinkedWorkOrderId.Should().BeNull();
        a.Status.Should().Be("Open");

        b.LinkedWorkOrderId.Should().Be(workOrderId);
        b.Status.Should().Be("Linked");
    }

    [Fact]
    public async Task Delete_requires_manager()
    {
        var driverId = await SeedUserAsync("Driver");
        var carId = await SeedTeamCarAsync();
        var issueId = await SeedIssueAsync(carId, driverId);

        var client = _factory.CreateClient().AsUser(userId: driverId, roles: "Driver");

        var res = await client.DeleteAsync($"/api/issue-reports/{issueId}");

        res.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Delete_clears_work_order_link_and_removes_issue()
    {
        var mgrId = await SeedUserAsync("Manager");
        var driverId = await SeedUserAsync("Driver");
        var carId = await SeedTeamCarAsync();

        var workOrderId = await SeedWorkOrderAsync(carId, createdByUserId: driverId, status: "Open");
        var issueId = await SeedIssueAsync(carId, driverId, status: "Linked", linkedWorkOrderId: workOrderId);


        var client = _factory.CreateClient().AsUser(userId: mgrId, roles: "Manager");

        var res = await client.DeleteAsync($"/api/issue-reports/{issueId}");

        res.StatusCode.Should().Be(HttpStatusCode.NoContent);

        using var scope2 = _factory.Services.CreateScope();
        var db2 = scope2.ServiceProvider.GetRequiredService<AppDbContext>();

        (await db2.IssueReports.AnyAsync(i => i.Id == issueId)).Should().BeFalse();
    }
}