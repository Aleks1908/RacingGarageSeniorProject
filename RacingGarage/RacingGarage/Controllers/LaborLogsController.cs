using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RacingGarage.Data;
using RacingGarage.dto;
using RacingGarage.Models;

namespace RacingGarage.Controllers;

[ApiController]
[Route("api/labor-logs")]
public class LaborLogsController : ControllerBase
{
    private readonly AppDbContext _db;

    public LaborLogsController(AppDbContext db) => _db = db;

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
    [HttpPost]
    public async Task<ActionResult<LaborLogReadDto>> Create([FromBody] LaborLogCreateDto dto)
    {
        if (dto.WorkOrderTaskId <= 0) return BadRequest("WorkOrderTaskId must be a positive integer.");
        if (dto.MechanicUserId <= 0) return BadRequest("MechanicUserId must be a positive integer.");
        if (dto.Minutes <= 0) return BadRequest("Minutes must be > 0.");

        var taskExists = await _db.WorkOrderTasks.AnyAsync(t => t.Id == dto.WorkOrderTaskId);
        if (!taskExists) return BadRequest($"WorkOrderTaskId '{dto.WorkOrderTaskId}' does not exist.");

        var mechExists = await _db.Users.AnyAsync(u => u.Id == dto.MechanicUserId);
        if (!mechExists) return BadRequest($"MechanicUserId '{dto.MechanicUserId}' does not exist.");

        var log = new LaborLog
        {
            WorkOrderTaskId = dto.WorkOrderTaskId,
            MechanicUserId = dto.MechanicUserId,
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
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] LaborLogUpdateDto dto)
    {
        if (dto.Minutes <= 0) return BadRequest("Minutes must be > 0.");

        var log = await _db.LaborLogs.FirstOrDefaultAsync(l => l.Id == id);
        if (log is null) return NotFound();

        log.Minutes = dto.Minutes;
        log.LogDate = dto.LogDate;
        log.Comment = dto.Comment?.Trim() ?? "";

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // DELETE /api/labor-logs/5
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var log = await _db.LaborLogs.FirstOrDefaultAsync(l => l.Id == id);
        if (log is null) return NotFound();

        _db.LaborLogs.Remove(log);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}