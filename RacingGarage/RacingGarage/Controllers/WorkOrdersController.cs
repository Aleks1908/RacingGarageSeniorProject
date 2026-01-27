using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RacingGarage.Data;
using RacingGarage.dto;
using RacingGarage.Models;

namespace RacingGarage.Controllers;

[ApiController]
[Route("api/work-orders")]
public class WorkOrdersController : ControllerBase
{
    private readonly AppDbContext _db;

    public WorkOrdersController(AppDbContext db) => _db = db;

    // GET /api/work-orders
    [HttpGet]
    public async Task<ActionResult<List<WorkOrderReadDto>>> GetAll(
        [FromQuery] int? teamCarId,
        [FromQuery] string? status,
        [FromQuery] string? priority)
    {
        var q = _db.WorkOrders.AsNoTracking();

        if (teamCarId.HasValue)
            q = q.Where(w => w.TeamCarId == teamCarId.Value);

        if (!string.IsNullOrWhiteSpace(status))
            q = q.Where(w => w.Status == status.Trim());

        if (!string.IsNullOrWhiteSpace(priority))
            q = q.Where(w => w.Priority == priority.Trim());

        var list = await q
            .OrderByDescending(w => w.CreatedAt)
            .Select(w => new WorkOrderReadDto
            {
                Id = w.Id,

                TeamCarId = w.TeamCarId,
                TeamCarNumber = w.TeamCar.CarNumber,

                CreatedByUserId = w.CreatedByUserId,
                CreatedByName = w.CreatedByUser.Name,

                AssignedToUserId = w.AssignedToUserId,
                AssignedToName = w.AssignedToUser != null ? w.AssignedToUser.Name : null,

                CarSessionId = w.CarSessionId,

                Title = w.Title,
                Description = w.Description,

                Priority = w.Priority,
                Status = w.Status,

                CreatedAt = w.CreatedAt,
                DueDate = w.DueDate,
                ClosedAt = w.ClosedAt
            })
            .ToListAsync();

        return Ok(list);
    }

    // GET /api/work-orders/{id}
    [HttpGet("{id:int}")]
    public async Task<ActionResult<WorkOrderReadDto>> GetById(int id)
    {
        var wo = await _db.WorkOrders
            .AsNoTracking()
            .Where(w => w.Id == id)
            .Select(w => new WorkOrderReadDto
            {
                Id = w.Id,

                TeamCarId = w.TeamCarId,
                TeamCarNumber = w.TeamCar.CarNumber,

                CreatedByUserId = w.CreatedByUserId,
                CreatedByName = w.CreatedByUser.Name,

                AssignedToUserId = w.AssignedToUserId,
                AssignedToName = w.AssignedToUser != null ? w.AssignedToUser.Name : null,

                CarSessionId = w.CarSessionId,

                Title = w.Title,
                Description = w.Description,

                Priority = w.Priority,
                Status = w.Status,

                CreatedAt = w.CreatedAt,
                DueDate = w.DueDate,
                ClosedAt = w.ClosedAt
            })
            .FirstOrDefaultAsync();

        if (wo is null) return NotFound();
        return Ok(wo);
    }

    // POST /api/work-orders
    [HttpPost]
    public async Task<ActionResult<WorkOrderReadDto>> Create([FromBody] WorkOrderCreateDto dto)
    {
        if (dto.TeamCarId <= 0) return BadRequest("TeamCarId must be a positive integer.");
        if (dto.CreatedByUserId <= 0) return BadRequest("CreatedByUserId must be a positive integer.");
        if (string.IsNullOrWhiteSpace(dto.Title)) return BadRequest("Title is required.");

        // FK checks
        var carExists = await _db.TeamCars.AnyAsync(c => c.Id == dto.TeamCarId);
        if (!carExists) return BadRequest($"TeamCarId '{dto.TeamCarId}' does not exist.");

        var creatorExists = await _db.Users.AnyAsync(u => u.Id == dto.CreatedByUserId);
        if (!creatorExists) return BadRequest($"CreatedByUserId '{dto.CreatedByUserId}' does not exist.");

        if (dto.AssignedToUserId.HasValue)
        {
            var assignedExists = await _db.Users.AnyAsync(u => u.Id == dto.AssignedToUserId.Value);
            if (!assignedExists) return BadRequest($"AssignedToUserId '{dto.AssignedToUserId.Value}' does not exist.");
        }

        if (dto.CarSessionId.HasValue)
        {
            var sessionExists = await _db.CarSessions.AnyAsync(s => s.Id == dto.CarSessionId.Value);
            if (!sessionExists) return BadRequest($"CarSessionId '{dto.CarSessionId.Value}' does not exist.");
        }

        var wo = new WorkOrder
        {
            TeamCarId = dto.TeamCarId,
            CreatedByUserId = dto.CreatedByUserId,
            AssignedToUserId = dto.AssignedToUserId,
            CarSessionId = dto.CarSessionId,

            Title = dto.Title.Trim(),
            Description = dto.Description?.Trim() ?? "",

            Priority = string.IsNullOrWhiteSpace(dto.Priority) ? "Medium" : dto.Priority.Trim(),
            Status = string.IsNullOrWhiteSpace(dto.Status) ? "Open" : dto.Status.Trim(),

            CreatedAt = DateTime.UtcNow,
            DueDate = dto.DueDate
        };

        _db.WorkOrders.Add(wo);
        await _db.SaveChangesAsync();

        // Return read DTO
        var created = await _db.WorkOrders
            .AsNoTracking()
            .Where(w => w.Id == wo.Id)
            .Select(w => new WorkOrderReadDto
            {
                Id = w.Id,

                TeamCarId = w.TeamCarId,
                TeamCarNumber = w.TeamCar.CarNumber,

                CreatedByUserId = w.CreatedByUserId,
                CreatedByName = w.CreatedByUser.Name,

                AssignedToUserId = w.AssignedToUserId,
                AssignedToName = w.AssignedToUser != null ? w.AssignedToUser.Name : null,

                CarSessionId = w.CarSessionId,

                Title = w.Title,
                Description = w.Description,

                Priority = w.Priority,
                Status = w.Status,

                CreatedAt = w.CreatedAt,
                DueDate = w.DueDate,
                ClosedAt = w.ClosedAt
            })
            .FirstAsync();

        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    // PUT /api/work-orders/{id}
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] WorkOrderUpdateDto dto)
    {
        if (dto.TeamCarId <= 0) return BadRequest("TeamCarId must be a positive integer.");
        if (string.IsNullOrWhiteSpace(dto.Title)) return BadRequest("Title is required.");

        var wo = await _db.WorkOrders.FirstOrDefaultAsync(w => w.Id == id);
        if (wo is null) return NotFound();
        
        var carExists = await _db.TeamCars.AnyAsync(c => c.Id == dto.TeamCarId);
        if (!carExists) return BadRequest($"TeamCarId '{dto.TeamCarId}' does not exist.");

        if (dto.AssignedToUserId.HasValue)
        {
            var assignedExists = await _db.Users.AnyAsync(u => u.Id == dto.AssignedToUserId.Value);
            if (!assignedExists) return BadRequest($"AssignedToUserId '{dto.AssignedToUserId.Value}' does not exist.");
        }

        if (dto.CarSessionId.HasValue)
        {
            var sessionExists = await _db.CarSessions.AnyAsync(s => s.Id == dto.CarSessionId.Value);
            if (!sessionExists) return BadRequest($"CarSessionId '{dto.CarSessionId.Value}' does not exist.");
        }

        wo.TeamCarId = dto.TeamCarId;
        wo.AssignedToUserId = dto.AssignedToUserId;
        wo.CarSessionId = dto.CarSessionId;

        wo.Title = dto.Title.Trim();
        wo.Description = dto.Description?.Trim() ?? "";

        wo.Priority = string.IsNullOrWhiteSpace(dto.Priority) ? wo.Priority : dto.Priority.Trim();
        wo.Status = string.IsNullOrWhiteSpace(dto.Status) ? wo.Status : dto.Status.Trim();

        wo.DueDate = dto.DueDate;
        wo.ClosedAt = dto.ClosedAt;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // DELETE /api/work-orders/{id}
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var wo = await _db.WorkOrders.FirstOrDefaultAsync(w => w.Id == id);
        if (wo is null) return NotFound();

        _db.WorkOrders.Remove(wo);
        await _db.SaveChangesAsync();

        return NoContent();
    }
}