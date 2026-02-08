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
[Route("api/labor-logs")]
public class LaborLogsController : ControllerBase
{
    private readonly AppDbContext _db;

    public LaborLogsController(AppDbContext db) => _db = db;

    private bool TryGetCurrentUserId(out int userId)
    {
        var idStr = User.FindFirstValue(ClaimTypes.NameIdentifier)
                    ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);

        return int.TryParse(idStr, out userId);
    }

    private bool IsManager() => User.IsInRole("Manager");

    // GET /api/labor-logs?workOrderTaskId=10
    [HttpGet]
    public async Task<ActionResult<List<LaborLogReadDto>>> GetAll([FromQuery] int? workOrderTaskId)
    {
        var q = _db.LaborLogs.AsNoTracking();

        if (workOrderTaskId.HasValue)
            q = q.Where(l => l.WorkOrderTaskId == workOrderTaskId.Value);

        var list = await q
            .OrderByDescending(l => l.LogDate)
            .ThenByDescending(l => l.Id)
            .Select(l => new LaborLogReadDto
            {
                Id = l.Id,
                WorkOrderTaskId = l.WorkOrderTaskId,
                MechanicUserId = l.MechanicUserId,
                MechanicName = l.MechanicUser.Name,
                Minutes = l.Minutes,
                LogDate = l.LogDate,
                Comment = l.Comment
            })
            .ToListAsync();

        return Ok(list);
    }

    // GET /api/labor-logs/5
    [HttpGet("{id:int}")]
    public async Task<ActionResult<LaborLogReadDto>> GetById(int id)
    {
        var log = await _db.LaborLogs
            .AsNoTracking()
            .Where(l => l.Id == id)
            .Select(l => new LaborLogReadDto
            {
                Id = l.Id,
                WorkOrderTaskId = l.WorkOrderTaskId,
                MechanicUserId = l.MechanicUserId,
                MechanicName = l.MechanicUser.Name,
                Minutes = l.Minutes,
                LogDate = l.LogDate,
                Comment = l.Comment
            })
            .FirstOrDefaultAsync();

        if (log is null) return NotFound();
        return Ok(log);
    }

    // POST /api/labor-logs
    [Authorize(Roles = "Mechanic,Manager")]
    [HttpPost]
    public async Task<ActionResult<LaborLogReadDto>> Create([FromBody] LaborLogCreateDto dto)
    {
        if (dto.WorkOrderTaskId <= 0) return BadRequest("WorkOrderTaskId must be a positive integer.");
        if (dto.Minutes <= 0) return BadRequest("Minutes must be > 0.");

        if (!TryGetCurrentUserId(out var currentUserId))
            return Unauthorized("Invalid token (missing user id).");

        var taskExists = await _db.WorkOrderTasks.AnyAsync(t => t.Id == dto.WorkOrderTaskId);
        if (!taskExists) return BadRequest($"WorkOrderTaskId '{dto.WorkOrderTaskId}' does not exist.");

        var log = new LaborLog
        {
            WorkOrderTaskId = dto.WorkOrderTaskId,
            MechanicUserId = currentUserId, 
            Minutes = dto.Minutes,
            LogDate = dto.LogDate,
            Comment = dto.Comment?.Trim() ?? ""
        };

        _db.LaborLogs.Add(log);
        await _db.SaveChangesAsync();

        var read = await _db.LaborLogs
            .AsNoTracking()
            .Where(l => l.Id == log.Id)
            .Select(l => new LaborLogReadDto
            {
                Id = l.Id,
                WorkOrderTaskId = l.WorkOrderTaskId,
                MechanicUserId = l.MechanicUserId,
                MechanicName = l.MechanicUser.Name,
                Minutes = l.Minutes,
                LogDate = l.LogDate,
                Comment = l.Comment
            })
            .FirstAsync();

        return CreatedAtAction(nameof(GetById), new { id = read.Id }, read);
    }

    // PUT /api/labor-logs/5
    [Authorize(Roles = "Mechanic,Manager")]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] LaborLogUpdateDto dto)
    {
        if (dto.Minutes <= 0) return BadRequest("Minutes must be > 0.");

        var log = await _db.LaborLogs.FirstOrDefaultAsync(l => l.Id == id);
        if (log is null) return NotFound();

        if (!IsManager())
        {
            if (!TryGetCurrentUserId(out var currentUserId))
                return Unauthorized("Invalid token (missing user id).");

            if (log.MechanicUserId != currentUserId)
                return Forbid();
        }

        log.Minutes = dto.Minutes;
        log.LogDate = dto.LogDate;
        log.Comment = dto.Comment?.Trim() ?? "";

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // DELETE /api/labor-logs/5
    [Authorize(Roles = "Mechanic,Manager")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var log = await _db.LaborLogs.FirstOrDefaultAsync(l => l.Id == id);
        if (log is null) return NotFound();

        if (!IsManager())
        {
            if (!TryGetCurrentUserId(out var currentUserId))
                return Unauthorized("Invalid token (missing user id).");

            if (log.MechanicUserId != currentUserId)
                return Forbid();
        }

        _db.LaborLogs.Remove(log);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}