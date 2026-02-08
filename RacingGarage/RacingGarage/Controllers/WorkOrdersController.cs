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
[Route("api/work-orders")]
public class WorkOrdersController : ControllerBase
{
    private readonly AppDbContext _db;

    public WorkOrdersController(AppDbContext db) => _db = db;

    private bool TryGetCurrentUserId(out int userId)
    {
        var idStr = User.FindFirstValue(ClaimTypes.NameIdentifier)
                    ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);

        return int.TryParse(idStr, out userId);
    }

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
    [Authorize(Roles = "Driver,Mechanic,Manager")]
    [HttpPost]
    public async Task<ActionResult<WorkOrderReadDto>> Create([FromBody] WorkOrderCreateDto dto)
    {
        if (dto.TeamCarId <= 0) return BadRequest("TeamCarId must be a positive integer.");
        if (string.IsNullOrWhiteSpace(dto.Title)) return BadRequest("Title is required.");

        if (!TryGetCurrentUserId(out var currentUserId))
            return Unauthorized("Invalid token (missing user id).");

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

        var wo = new WorkOrder
        {
            TeamCarId = dto.TeamCarId,
            CreatedByUserId = currentUserId,
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
    [Authorize(Roles = "Mechanic,Manager")]
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
    [Authorize(Roles = "Manager")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var wo = await _db.WorkOrders.FirstOrDefaultAsync(w => w.Id == id);
        if (wo is null) return NotFound();

        _db.WorkOrders.Remove(wo);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    // GET /api/work-orders/{id}/details
    [HttpGet("{id:int}/details")]
    public async Task<ActionResult<WorkOrderDetailsDto>> GetDetails(int id)
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

        var tasks = await _db.WorkOrderTasks
            .AsNoTracking()
            .Where(t => t.WorkOrderId == id)
            .OrderBy(t => t.SortOrder).ThenBy(t => t.Id)
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

        var labor = await _db.LaborLogs
            .AsNoTracking()
            .Where(l => _db.WorkOrderTasks.Any(t => t.Id == l.WorkOrderTaskId && t.WorkOrderId == id))
            .OrderByDescending(l => l.LogDate).ThenByDescending(l => l.Id)
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

        var installs = await _db.PartInstallations
            .AsNoTracking()
            .Where(pi => pi.WorkOrderId == id)
            .OrderByDescending(pi => pi.InstalledAt)
            .Select(pi => new PartInstallationReadDto
            {
                Id = pi.Id,
                WorkOrderId = pi.WorkOrderId,
                PartId = pi.PartId,
                PartSku = pi.Part.Sku,
                PartName = pi.Part.Name,
                InventoryLocationId = pi.InventoryLocationId,
                LocationCode = pi.InventoryLocation.Code,
                Quantity = pi.Quantity,
                InstalledByUserId = pi.InstalledByUserId,
                InstalledByName = pi.InstalledByUser != null ? pi.InstalledByUser.Name : null,
                InstalledAt = pi.InstalledAt,
                Notes = pi.Notes
            })
            .ToListAsync();

        return Ok(new WorkOrderDetailsDto
        {
            WorkOrder = wo,
            Tasks = tasks,
            LaborLogs = labor,
            PartInstallations = installs,
            TotalLaborMinutes = labor.Sum(x => x.Minutes),
            TotalInstalledPartsQty = installs.Sum(x => x.Quantity)
        });
    }
}