using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RacingGarage.Data;
using RacingGarage.dto;
using RacingGarage.Models;

namespace RacingGarage.Controllers;

[ApiController]
[Route("api/work-order-tasks")]
public class WorkOrderTasksController : ControllerBase
{
    private readonly AppDbContext _db;

    public WorkOrderTasksController(AppDbContext db) => _db = db;

    // GET /api/work-order-tasks?workOrderId=3
    [HttpGet]
    public async Task<ActionResult<List<WorkOrderTaskReadDto>>> GetAll([FromQuery] int? workOrderId)
    {
        var q = _db.WorkOrderTasks.AsNoTracking();

        if (workOrderId.HasValue)
            q = q.Where(t => t.WorkOrderId == workOrderId.Value);

        var list = await q
            .OrderBy(t => t.WorkOrderId)
            .ThenBy(t => t.SortOrder)
            .ThenBy(t => t.Id)
            .Select(t => new WorkOrderTaskReadDto
            {
                Id = t.Id,
                WorkOrderId = t.WorkOrderId,
                Title = t.Title,
                Description = t.Description,
                Status = t.Status,
                SortOrder = t.SortOrder,
                EstimatedMinutes = t.EstimatedMinutes,
                CompletedAt = t.CompletedAt
            })
            .ToListAsync();

        return Ok(list);
    }

    // GET /api/work-order-tasks/10
    [HttpGet("{id:int}")]
    public async Task<ActionResult<WorkOrderTaskReadDto>> GetById(int id)
    {
        var task = await _db.WorkOrderTasks
            .AsNoTracking()
            .Where(t => t.Id == id)
            .Select(t => new WorkOrderTaskReadDto
            {
                Id = t.Id,
                WorkOrderId = t.WorkOrderId,
                Title = t.Title,
                Description = t.Description,
                Status = t.Status,
                SortOrder = t.SortOrder,
                EstimatedMinutes = t.EstimatedMinutes,
                CompletedAt = t.CompletedAt
            })
            .FirstOrDefaultAsync();

        if (task is null) return NotFound();
        return Ok(task);
    }

    // POST /api/work-order-tasks
    [HttpPost]
    public async Task<ActionResult<WorkOrderTaskReadDto>> Create([FromBody] WorkOrderTaskCreateDto dto)
    {
        if (dto.WorkOrderId <= 0) return BadRequest("WorkOrderId must be a positive integer.");
        if (string.IsNullOrWhiteSpace(dto.Title)) return BadRequest("Title is required.");
        if (dto.SortOrder < 0) return BadRequest("SortOrder cannot be negative.");
        if (dto.EstimatedMinutes.HasValue && dto.EstimatedMinutes.Value < 0) return BadRequest("EstimatedMinutes cannot be negative.");

        var woExists = await _db.WorkOrders.AnyAsync(w => w.Id == dto.WorkOrderId);
        if (!woExists) return BadRequest($"WorkOrderId '{dto.WorkOrderId}' does not exist.");

        var task = new WorkOrderTask
        {
            WorkOrderId = dto.WorkOrderId,
            Title = dto.Title.Trim(),
            Description = dto.Description?.Trim() ?? "",
            Status = string.IsNullOrWhiteSpace(dto.Status) ? "Todo" : dto.Status.Trim(),
            SortOrder = dto.SortOrder,
            EstimatedMinutes = dto.EstimatedMinutes,
            CompletedAt = null
        };

        _db.WorkOrderTasks.Add(task);
        await _db.SaveChangesAsync();

        var read = new WorkOrderTaskReadDto
        {
            Id = task.Id,
            WorkOrderId = task.WorkOrderId,
            Title = task.Title,
            Description = task.Description,
            Status = task.Status,
            SortOrder = task.SortOrder,
            EstimatedMinutes = task.EstimatedMinutes,
            CompletedAt = task.CompletedAt
        };

        return CreatedAtAction(nameof(GetById), new { id = task.Id }, read);
    }

    // PUT /api/work-order-tasks/10
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] WorkOrderTaskUpdateDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Title)) return BadRequest("Title is required.");
        if (dto.SortOrder < 0) return BadRequest("SortOrder cannot be negative.");
        if (dto.EstimatedMinutes.HasValue && dto.EstimatedMinutes.Value < 0) return BadRequest("EstimatedMinutes cannot be negative.");

        var task = await _db.WorkOrderTasks.FirstOrDefaultAsync(t => t.Id == id);
        if (task is null) return NotFound();

        task.Title = dto.Title.Trim();
        task.Description = dto.Description?.Trim() ?? "";
        task.Status = string.IsNullOrWhiteSpace(dto.Status) ? task.Status : dto.Status.Trim();
        task.SortOrder = dto.SortOrder;
        task.EstimatedMinutes = dto.EstimatedMinutes;
        task.CompletedAt = dto.CompletedAt;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // DELETE /api/work-order-tasks/10
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var task = await _db.WorkOrderTasks.FirstOrDefaultAsync(t => t.Id == id);
        if (task is null) return NotFound();

        _db.WorkOrderTasks.Remove(task);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}