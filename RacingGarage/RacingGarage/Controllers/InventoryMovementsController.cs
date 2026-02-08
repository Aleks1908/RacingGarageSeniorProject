using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RacingGarage.Data;
using RacingGarage.dto;

namespace RacingGarage.Controllers;

[ApiController]
[Route("api/inventory-movements")]
public class InventoryMovementsController : ControllerBase
{
    private readonly AppDbContext _db;

    public InventoryMovementsController(AppDbContext db) => _db = db;

    // GET /api/inventory-movements?partId=1&locationId=2&workOrderId=3
    [HttpGet]
    public async Task<ActionResult<List<InventoryMovementReadDto>>> GetAll(
        [FromQuery] int? partId,
        [FromQuery] int? locationId,
        [FromQuery] int? workOrderId,
        [FromQuery] string? reason)
    {
        var q = _db.InventoryMovements.AsNoTracking();

        if (partId.HasValue) q = q.Where(m => m.PartId == partId.Value);
        if (locationId.HasValue) q = q.Where(m => m.InventoryLocationId == locationId.Value);
        if (workOrderId.HasValue) q = q.Where(m => m.WorkOrderId == workOrderId.Value);
        if (!string.IsNullOrWhiteSpace(reason)) q = q.Where(m => m.Reason == reason.Trim());

        var list = await q
            .OrderByDescending(m => m.PerformedAt)
            .ThenByDescending(m => m.Id)
            .Select(m => new InventoryMovementReadDto
            {
                Id = m.Id,
                PartId = m.PartId,
                PartSku = m.Part.Sku,
                PartName = m.Part.Name,
                InventoryLocationId = m.InventoryLocationId,
                LocationCode = m.InventoryLocation.Code,
                QuantityChange = m.QuantityChange,
                Reason = m.Reason,
                WorkOrderId = m.WorkOrderId,
                PerformedByUserId = m.PerformedByUserId,
                PerformedByName = m.PerformedByUser != null ? m.PerformedByUser.Name : null,
                PerformedAt = m.PerformedAt,
                Notes = m.Notes
            })
            .ToListAsync();

        return Ok(list);
    }
}