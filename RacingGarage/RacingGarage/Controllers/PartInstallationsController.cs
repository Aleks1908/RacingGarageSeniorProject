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
[Route("api/part-installations")]
public class PartInstallationsController : ControllerBase
{
    private readonly AppDbContext _db;

    public PartInstallationsController(AppDbContext db) => _db = db;

    private bool TryGetCurrentUserId(out int userId)
    {
        var idStr = User.FindFirstValue(ClaimTypes.NameIdentifier)
                    ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);

        return int.TryParse(idStr, out userId);
    }

    // GET /api/part-installations?workOrderId=3
    [HttpGet]
    public async Task<ActionResult<List<PartInstallationReadDto>>> GetAll([FromQuery] int? workOrderId)
    {
        var q = _db.PartInstallations.AsNoTracking();

        if (workOrderId.HasValue)
            q = q.Where(pi => pi.WorkOrderId == workOrderId.Value);

        var list = await q
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

        return Ok(list);
    }

    // GET /api/part-installations/{id}
    [HttpGet("{id:int}")]
    public async Task<ActionResult<PartInstallationReadDto>> GetById(int id)
    {
        var pi = await _db.PartInstallations
            .AsNoTracking()
            .Where(x => x.Id == id)
            .Select(x => new PartInstallationReadDto
            {
                Id = x.Id,
                WorkOrderId = x.WorkOrderId,
                PartId = x.PartId,
                PartSku = x.Part.Sku,
                PartName = x.Part.Name,
                InventoryLocationId = x.InventoryLocationId,
                LocationCode = x.InventoryLocation.Code,
                Quantity = x.Quantity,
                InstalledByUserId = x.InstalledByUserId,
                InstalledByName = x.InstalledByUser != null ? x.InstalledByUser.Name : null,
                InstalledAt = x.InstalledAt,
                Notes = x.Notes
            })
            .FirstOrDefaultAsync();

        if (pi is null) return NotFound();
        return Ok(pi);
    }

    // POST /api/part-installations
    [Authorize(Roles = "Mechanic,Manager")]
    [HttpPost]
    public async Task<ActionResult<PartInstallationReadDto>> Create([FromBody] PartInstallationCreateDto dto)
    {
        if (dto.WorkOrderId <= 0) return BadRequest("WorkOrderId must be a positive integer.");
        if (dto.PartId <= 0) return BadRequest("PartId must be a positive integer.");
        if (dto.InventoryLocationId <= 0) return BadRequest("InventoryLocationId must be a positive integer.");
        if (dto.Quantity <= 0) return BadRequest("Quantity must be > 0.");

        if (!TryGetCurrentUserId(out var currentUserId))
            return Unauthorized("Invalid token (missing user id).");

        var woExists = await _db.WorkOrders.AnyAsync(w => w.Id == dto.WorkOrderId);
        if (!woExists) return BadRequest($"WorkOrderId '{dto.WorkOrderId}' does not exist.");

        var partExists = await _db.Parts.AnyAsync(p => p.Id == dto.PartId && p.IsActive);
        if (!partExists) return BadRequest($"PartId '{dto.PartId}' does not exist or is inactive.");

        var locExists = await _db.InventoryLocations.AnyAsync(l => l.Id == dto.InventoryLocationId && l.IsActive);
        if (!locExists) return BadRequest($"InventoryLocationId '{dto.InventoryLocationId}' does not exist or is inactive.");

        await using var tx = await _db.Database.BeginTransactionAsync();

        var stock = await _db.InventoryStock
            .FirstOrDefaultAsync(s => s.PartId == dto.PartId && s.InventoryLocationId == dto.InventoryLocationId);

        if (stock is null)
            return BadRequest("No stock record exists for this part at this location.");

        var newQty = stock.Quantity - dto.Quantity;
        if (newQty < 0)
            return BadRequest($"Stock cannot go negative. Current={stock.Quantity}, requested={dto.Quantity}.");

        stock.Quantity = newQty;
        stock.UpdatedAt = DateTime.UtcNow;

        var movement = new InventoryMovement
        {
            PartId = dto.PartId,
            InventoryLocationId = dto.InventoryLocationId,
            QuantityChange = -dto.Quantity,
            Reason = "Install",
            WorkOrderId = dto.WorkOrderId,
            PerformedByUserId = currentUserId, 
            Notes = string.IsNullOrWhiteSpace(dto.Notes) ? "Part installation" : dto.Notes.Trim(),
            PerformedAt = DateTime.UtcNow
        };
        _db.InventoryMovements.Add(movement);
        
        var installation = new PartInstallation
        {
            WorkOrderId = dto.WorkOrderId,
            PartId = dto.PartId,
            InventoryLocationId = dto.InventoryLocationId,
            Quantity = dto.Quantity,
            InstalledByUserId = currentUserId, 
            InstalledAt = DateTime.UtcNow,
            Notes = dto.Notes?.Trim() ?? ""
        };
        _db.PartInstallations.Add(installation);

        await _db.SaveChangesAsync();
        await tx.CommitAsync();

        var read = await _db.PartInstallations
            .AsNoTracking()
            .Where(x => x.Id == installation.Id)
            .Select(x => new PartInstallationReadDto
            {
                Id = x.Id,
                WorkOrderId = x.WorkOrderId,
                PartId = x.PartId,
                PartSku = x.Part.Sku,
                PartName = x.Part.Name,
                InventoryLocationId = x.InventoryLocationId,
                LocationCode = x.InventoryLocation.Code,
                Quantity = x.Quantity,
                InstalledByUserId = x.InstalledByUserId,
                InstalledByName = x.InstalledByUser != null ? x.InstalledByUser.Name : null,
                InstalledAt = x.InstalledAt,
                Notes = x.Notes
            })
            .FirstAsync();

        return CreatedAtAction(nameof(GetById), new { id = read.Id }, read);
    }
}