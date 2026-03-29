using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RacingGarage.Data;
using RacingGarage.dto;
using RacingGarage.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace RacingGarage.Controllers;

[ApiController]
[Route("api/issue-reports")]
public class IssueReportsController : ControllerBase
{
    private readonly AppDbContext _db;

    private const string ISSUE_STATUS_OPEN = "Open";
    private const string ISSUE_STATUS_LINKED = "Linked";
    private const string ISSUE_STATUS_CLOSED = "Closed";

    private const string WO_STATUS_CLOSED = "Closed";

    public IssueReportsController(AppDbContext db) => _db = db;

    private bool TryGetCurrentUserId(out int userId)
    {
        var idStr = User.FindFirstValue(ClaimTypes.NameIdentifier)
                    ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);

        return int.TryParse(idStr, out userId);
    }

    private bool IsInRole(string role) => User.IsInRole(role);

    private static bool IsClosed(string? status) =>
        string.Equals(status?.Trim(), ISSUE_STATUS_CLOSED, StringComparison.OrdinalIgnoreCase);

    private static bool WoIsClosed(string? status) =>
        string.Equals(status?.Trim(), WO_STATUS_CLOSED, StringComparison.OrdinalIgnoreCase);
    
    private async Task SyncIssueWorkOrderLinkAsync(int issueId, int? workOrderId)
    {
        var issue = await _db.IssueReports.FirstOrDefaultAsync(i => i.Id == issueId);
        if (issue is null) return;

        if (workOrderId is null)
        {
            if (issue.LinkedWorkOrderId.HasValue)
            {
                var prevWo = await _db.WorkOrders.FirstOrDefaultAsync(w => w.Id == issue.LinkedWorkOrderId.Value);
                if (prevWo != null && prevWo.LinkedIssueId == issue.Id)
                    prevWo.LinkedIssueId = null;
            }

            issue.LinkedWorkOrderId = null;
            issue.Status = ISSUE_STATUS_OPEN;
            issue.ClosedAt = null;

            return;
        }

        var wo = await _db.WorkOrders.FirstOrDefaultAsync(w => w.Id == workOrderId.Value);
        if (wo is null)
            throw new InvalidOperationException($"LinkedWorkOrderId '{workOrderId}' does not exist.");
        
        if (wo.TeamCarId != issue.TeamCarId)
            throw new InvalidOperationException("Cannot link Issue and Work Order from different cars.");

        if (issue.LinkedWorkOrderId.HasValue && issue.LinkedWorkOrderId.Value != wo.Id)
        {
            var prevWo = await _db.WorkOrders.FirstOrDefaultAsync(w => w.Id == issue.LinkedWorkOrderId.Value);
            if (prevWo != null && prevWo.LinkedIssueId == issue.Id)
                prevWo.LinkedIssueId = null;
        }

        var otherIssues = await _db.IssueReports
            .Where(x => x.LinkedWorkOrderId == wo.Id && x.Id != issue.Id)
            .ToListAsync();

        foreach (var other in otherIssues)
        {
            other.LinkedWorkOrderId = null;
            other.Status = ISSUE_STATUS_OPEN;
            other.ClosedAt = null;
        }

        if (wo.LinkedIssueId.HasValue && wo.LinkedIssueId.Value != issue.Id)
        {
            var prevIssue = await _db.IssueReports.FirstOrDefaultAsync(i => i.Id == wo.LinkedIssueId.Value);
            if (prevIssue != null && prevIssue.LinkedWorkOrderId == wo.Id)
            {
                prevIssue.LinkedWorkOrderId = null;
                prevIssue.Status = ISSUE_STATUS_OPEN;
                prevIssue.ClosedAt = null;
            }
        }

        issue.LinkedWorkOrderId = wo.Id;
        wo.LinkedIssueId = issue.Id;

        if (WoIsClosed(wo.Status))
        {
            issue.Status = ISSUE_STATUS_CLOSED;
            issue.ClosedAt ??= DateTime.UtcNow;
        }
        else
        {
            issue.Status = ISSUE_STATUS_LINKED;
            issue.ClosedAt = null;
        }
    }

    // GET /api/issue-reports?teamCarId=2&status=Open&severity=High&reportedByUserId=1
    [HttpGet]
    public async Task<ActionResult<List<IssueReportReadDto>>> GetAll(
        [FromQuery] int? teamCarId,
        [FromQuery] int? reportedByUserId,
        [FromQuery] string? status,
        [FromQuery] string? severity)
    {
        var q = _db.IssueReports.AsNoTracking();

        if (teamCarId.HasValue)
            q = q.Where(i => i.TeamCarId == teamCarId.Value);

        if (!string.IsNullOrWhiteSpace(status))
            q = q.Where(i => i.Status == status.Trim());

        if (!string.IsNullOrWhiteSpace(severity))
            q = q.Where(i => i.Severity == severity.Trim());

        if (IsInRole("Driver") && !IsInRole("Manager"))
        {
            if (!TryGetCurrentUserId(out var currentUserId))
                return Unauthorized("Invalid token (missing user id).");

            var targetReporter = reportedByUserId ?? currentUserId;
            if (targetReporter != currentUserId)
                return Forbid();

            q = q.Where(i => i.ReportedByUserId == currentUserId);
        }
        else
        {
            if (reportedByUserId.HasValue)
                q = q.Where(i => i.ReportedByUserId == reportedByUserId.Value);
        }

        var list = await q
            .OrderByDescending(i => i.ReportedAt)
            .Select(i => new IssueReportReadDto
            {
                Id = i.Id,

                TeamCarId = i.TeamCarId,
                TeamCarNumber = i.TeamCar.CarNumber,

                CarSessionId = i.CarSessionId,

                ReportedByUserId = i.ReportedByUserId,
                ReportedByName = i.ReportedByUser.Name,

                LinkedWorkOrderId = i.LinkedWorkOrderId,

                Title = i.Title,
                Description = i.Description,

                Severity = i.Severity,
                Status = i.Status,

                ReportedAt = i.ReportedAt,
                ClosedAt = i.ClosedAt
            })
            .ToListAsync();

        return Ok(list);
    }

    // GET /api/issue-reports/{id}
    [HttpGet("{id:int}")]
    public async Task<ActionResult<IssueReportReadDto>> GetById(int id)
    {
        var issue = await _db.IssueReports
            .AsNoTracking()
            .Where(i => i.Id == id)
            .Select(i => new IssueReportReadDto
            {
                Id = i.Id,

                TeamCarId = i.TeamCarId,
                TeamCarNumber = i.TeamCar.CarNumber,

                CarSessionId = i.CarSessionId,

                ReportedByUserId = i.ReportedByUserId,
                ReportedByName = i.ReportedByUser.Name,

                LinkedWorkOrderId = i.LinkedWorkOrderId,

                Title = i.Title,
                Description = i.Description,

                Severity = i.Severity,
                Status = i.Status,

                ReportedAt = i.ReportedAt,
                ClosedAt = i.ClosedAt
            })
            .FirstOrDefaultAsync();

        if (issue is null) return NotFound();

        if (User.IsInRole("Driver") && !User.IsInRole("Manager"))
        {
            if (!TryGetCurrentUserId(out var currentUserId))
                return Unauthorized("Invalid token (missing user id).");

            if (issue.ReportedByUserId != currentUserId)
                return Forbid();
        }

        return Ok(issue);
    }

    // POST /api/issue-reports
    [Authorize(Roles = "Driver,Manager")]
    [HttpPost]
    public async Task<ActionResult<IssueReportReadDto>> Create([FromBody] IssueReportCreateDto dto)
    {
        if (dto.TeamCarId <= 0) return BadRequest("TeamCarId must be a positive integer.");
        if (string.IsNullOrWhiteSpace(dto.Title)) return BadRequest("Title is required.");

        if (!TryGetCurrentUserId(out var currentUserId))
            return Unauthorized("Invalid token (missing user id).");

        var carExists = await _db.TeamCars.AnyAsync(c => c.Id == dto.TeamCarId);
        if (!carExists) return BadRequest($"TeamCarId '{dto.TeamCarId}' does not exist.");

        if (dto.CarSessionId.HasValue)
        {
            var sessionExists = await _db.CarSessions.AnyAsync(s => s.Id == dto.CarSessionId.Value);
            if (!sessionExists) return BadRequest($"CarSessionId '{dto.CarSessionId.Value}' does not exist.");
        }

        var issue = new IssueReport
        {
            TeamCarId = dto.TeamCarId,
            CarSessionId = dto.CarSessionId,
            ReportedByUserId = currentUserId,

            Title = dto.Title.Trim(),
            Description = dto.Description?.Trim() ?? "",

            Severity = string.IsNullOrWhiteSpace(dto.Severity) ? "Medium" : dto.Severity.Trim(),
            Status = string.IsNullOrWhiteSpace(dto.Status) ? ISSUE_STATUS_OPEN : dto.Status.Trim(),

            ReportedAt = DateTime.UtcNow
        };

        _db.IssueReports.Add(issue);
        await _db.SaveChangesAsync();

        var created = await _db.IssueReports
            .AsNoTracking()
            .Where(i => i.Id == issue.Id)
            .Select(i => new IssueReportReadDto
            {
                Id = i.Id,
                TeamCarId = i.TeamCarId,
                TeamCarNumber = i.TeamCar.CarNumber,
                CarSessionId = i.CarSessionId,
                ReportedByUserId = i.ReportedByUserId,
                ReportedByName = i.ReportedByUser.Name,
                LinkedWorkOrderId = i.LinkedWorkOrderId,
                Title = i.Title,
                Description = i.Description,
                Severity = i.Severity,
                Status = i.Status,
                ReportedAt = i.ReportedAt,
                ClosedAt = i.ClosedAt
            })
            .FirstAsync();

        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    // PUT /api/issue-reports/{id}
    [Authorize(Roles = "Driver,Manager")]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] IssueReportUpdateDto dto)
    {
        if (dto.TeamCarId <= 0) return BadRequest("TeamCarId must be a positive integer.");
        if (string.IsNullOrWhiteSpace(dto.Title)) return BadRequest("Title is required.");

        var issue = await _db.IssueReports.FirstOrDefaultAsync(i => i.Id == id);
        if (issue is null) return NotFound();

        if (User.IsInRole("Driver") && !User.IsInRole("Manager"))
        {
            if (!TryGetCurrentUserId(out var currentUserId))
                return Unauthorized("Invalid token (missing user id).");

            if (issue.ReportedByUserId != currentUserId)
                return Forbid();
        }

        var carExists = await _db.TeamCars.AnyAsync(c => c.Id == dto.TeamCarId);
        if (!carExists) return BadRequest($"TeamCarId '{dto.TeamCarId}' does not exist.");

        if (dto.CarSessionId.HasValue)
        {
            var sessionExists = await _db.CarSessions.AnyAsync(s => s.Id == dto.CarSessionId.Value);
            if (!sessionExists) return BadRequest($"CarSessionId '{dto.CarSessionId.Value}' does not exist.");
        }

        issue.TeamCarId = dto.TeamCarId;
        issue.CarSessionId = dto.CarSessionId;

        issue.Title = dto.Title.Trim();
        issue.Description = dto.Description?.Trim() ?? "";

        issue.Severity = string.IsNullOrWhiteSpace(dto.Severity) ? issue.Severity : dto.Severity.Trim();

        issue.Status = string.IsNullOrWhiteSpace(dto.Status) ? issue.Status : dto.Status.Trim();
        issue.ClosedAt = dto.ClosedAt;

        await SyncIssueWorkOrderLinkAsync(issue.Id, dto.LinkedWorkOrderId);

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // DELETE /api/issue-reports/{id}
    [Authorize(Roles = "Manager")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var issue = await _db.IssueReports.FirstOrDefaultAsync(i => i.Id == id);
        if (issue is null) return NotFound();

        if (issue.LinkedWorkOrderId.HasValue)
        {
            var wo = await _db.WorkOrders.FirstOrDefaultAsync(w => w.Id == issue.LinkedWorkOrderId.Value);
            if (wo != null && wo.LinkedIssueId == issue.Id)
                wo.LinkedIssueId = null;
        }

        _db.IssueReports.Remove(issue);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // POST /api/issue-reports/{id}/link-work-order
    [Authorize(Roles = "Mechanic,Manager")]
    [HttpPost("{id:int}/link-work-order")]
    public async Task<IActionResult> LinkWorkOrder(int id, [FromBody] IssueReportLinkWorkOrderDto dto)
    {
        var issue = await _db.IssueReports.FirstOrDefaultAsync(i => i.Id == id);
        if (issue is null) return NotFound();

        await SyncIssueWorkOrderLinkAsync(issue.Id, dto.LinkedWorkOrderId);

        await _db.SaveChangesAsync();
        return NoContent();
    }
}