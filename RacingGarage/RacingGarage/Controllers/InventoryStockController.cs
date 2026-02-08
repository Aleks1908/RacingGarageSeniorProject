using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RacingGarage.Data;
using RacingGarage.dto;
using RacingGarage.Models;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;

namespace RacingGarage.Controllers;

[ApiController]
[Route("api/inventory-stock")]
public class InventoryStockController : ControllerBase
{
    private readonly AppDbContext _db;

    public InventoryStockController(AppDbContext db) => _db = db;

    // GET /api/inventory-stock?partId=1&locationId=2
    [HttpGet]
    public async Task<ActionResult<List<InventoryStockReadDto>>> GetAll(
        [FromQuery] int? partId,
        [FromQuery] int? locationId)
    {
        var q = _db.InventoryStock.AsNoTracking();

        if (partId.HasValue) q = q.Where(s => s.PartId == partId.Value);
        if (locationId.HasValue) q = q.Where(s => s.InventoryLocationId == locationId.Value);

        var list = await q
            .OrderBy(s => s.InventoryLocation.Code)
            .ThenBy(s => s.Part.Sku)
            .Select(s => new InventoryStockReadDto
            {
                Id = s.Id,
                PartId = s.PartId,
                PartName = s.Part.Name,
                PartSku = s.Part.Sku,
                InventoryLocationId = s.InventoryLocationId,
                LocationCode = s.InventoryLocation.Code,
                Quantity = s.Quantity,
                UpdatedAt = s.UpdatedAt
            })
            .ToListAsync();

        return Ok(list);
    }

    // POST /api/inventory-stock/adjust
    [Authorize(Roles = "PartsClerk,Manager")]
    [HttpPost("adjust")]
    public async Task<ActionResult<InventoryStockReadDto>> Adjust([FromBody] InventoryStockAdjustDto dto)
    {
        if (dto.PartId <= 0) return BadRequest("PartId must be a positive integer.");
        if (dto.InventoryLocationId <= 0) return BadRequest("InventoryLocationId must be a positive integer.");
        if (dto.QuantityChange == 0) return BadRequest("QuantityChange cannot be 0.");
        
        var partExists = await _db.Parts.AnyAsync(p => p.Id == dto.PartId && p.IsActive);
        if (!partExists) return BadRequest($"PartId '{dto.PartId}' does not exist or is inactive.");

        var locExists = await _db.InventoryLocations.AnyAsync(l => l.Id == dto.InventoryLocationId && l.IsActive);
        if (!locExists) return BadRequest($"InventoryLocationId '{dto.InventoryLocationId}' does not exist or is inactive.");

        if (dto.WorkOrderId.HasValue)
        {
            var woExists = await _db.WorkOrders.AnyAsync(w => w.Id == dto.WorkOrderId.Value);
            if (!woExists) return BadRequest($"WorkOrderId '{dto.WorkOrderId.Value}' does not exist.");
        }

        var currentUserIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier)
                               ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);

        if (!int.TryParse(currentUserIdStr, out var currentUserId))
            return Unauthorized("Invalid token (missing user id).");

        await using var tx = await _db.Database.BeginTransactionAsync();

        var stock = await _db.InventoryStock
            .FirstOrDefaultAsync(s => s.PartId == dto.PartId && s.InventoryLocationId == dto.InventoryLocationId);

        if (stock is null)
        {
            if (dto.QuantityChange < 0)
                return BadRequest("Cannot reduce stock below 0 (no existing stock row).");

            stock = new InventoryStock
            {
                PartId = dto.PartId,
                InventoryLocationId = dto.InventoryLocationId,
                Quantity = 0,
                UpdatedAt = DateTime.UtcNow
            };
            _db.InventoryStock.Add(stock);
            await _db.SaveChangesAsync();
        }

        var newQty = stock.Quantity + dto.QuantityChange;
        if (newQty < 0)
            return BadRequest($"Stock cannot go negative. Current={stock.Quantity}, change={dto.QuantityChange}.");

        stock.Quantity = newQty;
        stock.UpdatedAt = DateTime.UtcNow;

        var movement = new InventoryMovement
        {
            PartId = dto.PartId,
            InventoryLocationId = dto.InventoryLocationId,
            QuantityChange = dto.QuantityChange,
            Reason = string.IsNullOrWhiteSpace(dto.Reason) ? "Adjustment" : dto.Reason.Trim(),
            WorkOrderId = dto.WorkOrderId,
            PerformedByUserId = currentUserId,
            Notes = dto.Notes?.Trim() ?? "",
            PerformedAt = DateTime.UtcNow
        };

        _db.InventoryMovements.Add(movement);
        await _db.SaveChangesAsync();

        await tx.CommitAsync();

        var read = await _db.InventoryStock
            .AsNoTracking()
            .Where(s => s.Id == stock.Id)
            .Select(s => new InventoryStockReadDto
            {
                Id = s.Id,
                PartId = s.PartId,
                PartName = s.Part.Name,
                PartSku = s.Part.Sku,
                InventoryLocationId = s.InventoryLocationId,
                LocationCode = s.InventoryLocation.Code,
                Quantity = s.Quantity,
                UpdatedAt = s.UpdatedAt
            })
            .FirstAsync();

        return Ok(read);
    }
}