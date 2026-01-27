using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RacingGarage.Data;
using RacingGarage.dto;
using RacingGarage.Models;

namespace RacingGarage.Controllers;

[ApiController]
[Route("api/issue-reports")]
public class IssueReportsController : ControllerBase
{
    private readonly AppDbContext _db;

    public IssueReportsController(AppDbContext db) => _db = db;

    // GET /api/issue-reports?teamCarId=2&status=Open&severity=High
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

        if (reportedByUserId.HasValue)
            q = q.Where(i => i.ReportedByUserId == reportedByUserId.Value);

        if (!string.IsNullOrWhiteSpace(status))
            q = q.Where(i => i.Status == status.Trim());

        if (!string.IsNullOrWhiteSpace(severity))
            q = q.Where(i => i.Severity == severity.Trim());

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
        return Ok(issue);
    }

    // POST /api/issue-reports
    [HttpPost]
    public async Task<ActionResult<IssueReportReadDto>> Create([FromBody] IssueReportCreateDto dto)
    {
        if (dto.TeamCarId <= 0) return BadRequest("TeamCarId must be a positive integer.");
        if (dto.ReportedByUserId <= 0) return BadRequest("ReportedByUserId must be a positive integer.");
        if (string.IsNullOrWhiteSpace(dto.Title)) return BadRequest("Title is required.");

        // FK checks
        var carExists = await _db.TeamCars.AnyAsync(c => c.Id == dto.TeamCarId);
        if (!carExists) return BadRequest($"TeamCarId '{dto.TeamCarId}' does not exist.");

        var reporterExists = await _db.Users.AnyAsync(u => u.Id == dto.ReportedByUserId);
        if (!reporterExists) return BadRequest($"ReportedByUserId '{dto.ReportedByUserId}' does not exist.");

        if (dto.CarSessionId.HasValue)
        {
            var sessionExists = await _db.CarSessions.AnyAsync(s => s.Id == dto.CarSessionId.Value);
            if (!sessionExists) return BadRequest($"CarSessionId '{dto.CarSessionId.Value}' does not exist.");
        }

        var issue = new IssueReport
        {
            TeamCarId = dto.TeamCarId,
            CarSessionId = dto.CarSessionId,
            ReportedByUserId = dto.ReportedByUserId,

            Title = dto.Title.Trim(),
            Description = dto.Description?.Trim() ?? "",

            Severity = string.IsNullOrWhiteSpace(dto.Severity) ? "Medium" : dto.Severity.Trim(),
            Status = string.IsNullOrWhiteSpace(dto.Status) ? "Open" : dto.Status.Trim(),

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
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] IssueReportUpdateDto dto)
    {
        if (dto.TeamCarId <= 0) return BadRequest("TeamCarId must be a positive integer.");
        if (string.IsNullOrWhiteSpace(dto.Title)) return BadRequest("Title is required.");

        var issue = await _db.IssueReports.FirstOrDefaultAsync(i => i.Id == id);
        if (issue is null) return NotFound();

        // FK checks
        var carExists = await _db.TeamCars.AnyAsync(c => c.Id == dto.TeamCarId);
        if (!carExists) return BadRequest($"TeamCarId '{dto.TeamCarId}' does not exist.");

        if (dto.CarSessionId.HasValue)
        {
            var sessionExists = await _db.CarSessions.AnyAsync(s => s.Id == dto.CarSessionId.Value);
            if (!sessionExists) return BadRequest($"CarSessionId '{dto.CarSessionId.Value}' does not exist.");
        }

        if (dto.LinkedWorkOrderId.HasValue)
        {
            var woExists = await _db.WorkOrders.AnyAsync(w => w.Id == dto.LinkedWorkOrderId.Value);
            if (!woExists) return BadRequest($"LinkedWorkOrderId '{dto.LinkedWorkOrderId.Value}' does not exist.");
        }

        issue.TeamCarId = dto.TeamCarId;
        issue.CarSessionId = dto.CarSessionId;

        issue.Title = dto.Title.Trim();
        issue.Description = dto.Description?.Trim() ?? "";

        issue.Severity = string.IsNullOrWhiteSpace(dto.Severity) ? issue.Severity : dto.Severity.Trim();
        issue.Status = string.IsNullOrWhiteSpace(dto.Status) ? issue.Status : dto.Status.Trim();

        issue.LinkedWorkOrderId = dto.LinkedWorkOrderId;
        issue.ClosedAt = dto.ClosedAt;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // DELETE /api/issue-reports/{id}
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var issue = await _db.IssueReports.FirstOrDefaultAsync(i => i.Id == id);
        if (issue is null) return NotFound();

        _db.IssueReports.Remove(issue);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}