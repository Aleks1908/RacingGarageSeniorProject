using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RacingGarage.Data;
using RacingGarage.dto;
using RacingGarage.Models;

namespace RacingGarage.Controllers;

[ApiController]
[Route("api/parts")]
public class PartsController : ControllerBase
{
    private readonly AppDbContext _db;

    public PartsController(AppDbContext db) => _db = db;

    // GET /api/parts?activeOnly=true&category=Brakes&supplierId=1&q=pad
    [HttpGet]
    public async Task<ActionResult<List<PartReadDto>>> GetAll(
        [FromQuery] bool? activeOnly,
        [FromQuery] string? category,
        [FromQuery] int? supplierId,
        [FromQuery] string? q,
        [FromQuery] int? locationId,
        [FromQuery] bool? needsReorder)
    {
    if (needsReorder == true && !locationId.HasValue)
        return BadRequest("locationId is required when needsReorder=true.");

    var partsQuery = _db.Parts.AsNoTracking();

    if (activeOnly == true)
        partsQuery = partsQuery.Where(p => p.IsActive);

    if (!string.IsNullOrWhiteSpace(category))
        partsQuery = partsQuery.Where(p => p.Category == category.Trim());

    if (supplierId.HasValue)
        partsQuery = partsQuery.Where(p => p.SupplierId == supplierId.Value);

    if (!string.IsNullOrWhiteSpace(q))
    {
        var term = q.Trim();
        partsQuery = partsQuery.Where(p => p.Name.Contains(term) || p.Sku.Contains(term));
    }

    if (locationId.HasValue)
    {
        var locId = locationId.Value;

        var queryWithStock =
            from p in partsQuery
            join s in _db.InventoryStock.AsNoTracking().Where(x => x.InventoryLocationId == locId)
                on p.Id equals s.PartId into stockJoin
            from s in stockJoin.DefaultIfEmpty()
            select new PartReadDto
            {
                Id = p.Id,
                Name = p.Name,
                Sku = p.Sku,
                Category = p.Category,
                UnitCost = p.UnitCost,
                ReorderPoint = p.ReorderPoint,
                SupplierId = p.SupplierId,
                SupplierName = p.Supplier != null ? p.Supplier.Name : null,
                IsActive = p.IsActive,
                CreatedAt = p.CreatedAt,

                CurrentStock = s != null ? s.Quantity : 0,
                NeedsReorder = p.ReorderPoint > 0 && ((s != null ? s.Quantity : 0) < p.ReorderPoint)
            };

        if (needsReorder == true)
            queryWithStock = queryWithStock.Where(x => x.NeedsReorder == true);

        var list = await queryWithStock
            .OrderBy(x => x.Category)
            .ThenBy(x => x.Name)
            .ToListAsync();

        return Ok(list);
    }
    
    var listNoStock = await partsQuery
        .OrderBy(p => p.Category)
        .ThenBy(p => p.Name)
        .Select(p => new PartReadDto
        {
            Id = p.Id,
            Name = p.Name,
            Sku = p.Sku,
            Category = p.Category,
            UnitCost = p.UnitCost,
            ReorderPoint = p.ReorderPoint,
            SupplierId = p.SupplierId,
            SupplierName = p.Supplier != null ? p.Supplier.Name : null,
            IsActive = p.IsActive,
            CreatedAt = p.CreatedAt,
            CurrentStock = null,
            NeedsReorder = null
        })
        .ToListAsync();

    return Ok(listNoStock);
    }

    // GET /api/parts/{id}
    [HttpGet("{id:int}")]
    public async Task<ActionResult<PartReadDto>> GetById(int id)
    {
        var p = await _db.Parts
            .AsNoTracking()
            .Where(x => x.Id == id)
            .Select(x => new PartReadDto
            {
                Id = x.Id,
                Name = x.Name,
                Sku = x.Sku,
                Category = x.Category,
                UnitCost = x.UnitCost,
                ReorderPoint = x.ReorderPoint,
                SupplierId = x.SupplierId,
                SupplierName = x.Supplier != null ? x.Supplier.Name : null,
                IsActive = x.IsActive,
                CreatedAt = x.CreatedAt
            })
            .FirstOrDefaultAsync();

        if (p is null) return NotFound();
        return Ok(p);
    }

    // POST /api/parts
    [Authorize(Roles = "PartsClerk,Manager")]
    [HttpPost]
    public async Task<ActionResult<PartReadDto>> Create([FromBody] PartCreateDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("Name is required.");
        if (string.IsNullOrWhiteSpace(dto.Sku)) return BadRequest("Sku is required.");
        if (string.IsNullOrWhiteSpace(dto.Category)) return BadRequest("Category is required.");
        if (dto.UnitCost < 0) return BadRequest("UnitCost cannot be negative.");
        if (dto.ReorderPoint < 0) return BadRequest("ReorderPoint cannot be negative.");

        var sku = dto.Sku.Trim().ToUpperInvariant();

        var skuTaken = await _db.Parts.AnyAsync(p => p.Sku == sku);
        if (skuTaken) return Conflict($"Part with Sku '{sku}' already exists.");

        if (dto.SupplierId.HasValue)
        {
            var supplierExists = await _db.Suppliers.AnyAsync(s => s.Id == dto.SupplierId.Value);
            if (!supplierExists) return BadRequest($"SupplierId '{dto.SupplierId.Value}' does not exist.");
        }

        var part = new Part
        {
            Name = dto.Name.Trim(),
            Sku = sku,
            Category = dto.Category.Trim(),
            UnitCost = dto.UnitCost,
            ReorderPoint = dto.ReorderPoint,
            SupplierId = dto.SupplierId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _db.Parts.Add(part);
        await _db.SaveChangesAsync();

        var read = await _db.Parts
            .AsNoTracking()
            .Where(p => p.Id == part.Id)
            .Select(p => new PartReadDto
            {
                Id = p.Id,
                Name = p.Name,
                Sku = p.Sku,
                Category = p.Category,
                UnitCost = p.UnitCost,
                ReorderPoint = p.ReorderPoint,
                SupplierId = p.SupplierId,
                SupplierName = p.Supplier != null ? p.Supplier.Name : null,
                IsActive = p.IsActive,
                CreatedAt = p.CreatedAt
            })
            .FirstAsync();

        return CreatedAtAction(nameof(GetById), new { id = read.Id }, read);
    }

    // PUT /api/parts/{id}
    [Authorize(Roles = "PartsClerk,Manager")]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] PartUpdateDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("Name is required.");
        if (string.IsNullOrWhiteSpace(dto.Sku)) return BadRequest("Sku is required.");
        if (string.IsNullOrWhiteSpace(dto.Category)) return BadRequest("Category is required.");
        if (dto.UnitCost < 0) return BadRequest("UnitCost cannot be negative.");
        if (dto.ReorderPoint < 0) return BadRequest("ReorderPoint cannot be negative.");

        var part = await _db.Parts.FirstOrDefaultAsync(p => p.Id == id);
        if (part is null) return NotFound();

        var sku = dto.Sku.Trim().ToUpperInvariant();
        if (!string.Equals(part.Sku, sku, StringComparison.OrdinalIgnoreCase))
        {
            var taken = await _db.Parts.AnyAsync(p => p.Sku == sku && p.Id != id);
            if (taken) return Conflict($"Part with Sku '{sku}' already exists.");
        }

        if (dto.SupplierId.HasValue)
        {
            var supplierExists = await _db.Suppliers.AnyAsync(s => s.Id == dto.SupplierId.Value);
            if (!supplierExists) return BadRequest($"SupplierId '{dto.SupplierId.Value}' does not exist.");
        }

        part.Name = dto.Name.Trim();
        part.Sku = sku;
        part.Category = dto.Category.Trim();
        part.UnitCost = dto.UnitCost;
        part.ReorderPoint = dto.ReorderPoint;
        part.SupplierId = dto.SupplierId;
        part.IsActive = dto.IsActive;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // DELETE /api/parts/{id} (soft delete)
    [Authorize(Roles = "PartsClerk,Manager")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var part = await _db.Parts.FirstOrDefaultAsync(p => p.Id == id);
        if (part is null) return NotFound();

        part.IsActive = false;
        await _db.SaveChangesAsync();
        return NoContent();
    }
}