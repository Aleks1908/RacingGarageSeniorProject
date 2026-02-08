using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RacingGarage.Data;
using RacingGarage.dto;
using RacingGarage.Models;

namespace RacingGarage.Controllers;

[ApiController]
[Route("api/inventory-locations")]
public class InventoryLocationsController : ControllerBase
{
    private readonly AppDbContext _db;

    public InventoryLocationsController(AppDbContext db) => _db = db;

    // GET /api/inventory-locations
    [HttpGet]
    public async Task<ActionResult<List<InventoryLocationReadDto>>> GetAll([FromQuery] bool? activeOnly)
    {
        var q = _db.InventoryLocations.AsNoTracking();

        if (activeOnly == true)
            q = q.Where(l => l.IsActive);

        var list = await q
            .OrderBy(l => l.Name)
            .Select(l => new InventoryLocationReadDto
            {
                Id = l.Id,
                Name = l.Name,
                Code = l.Code,
                Description = l.Description,
                IsActive = l.IsActive,
                CreatedAt = l.CreatedAt
            })
            .ToListAsync();

        return Ok(list);
    }

    // GET /api/inventory-locations/{id}
    [HttpGet("{id:int}")]
    public async Task<ActionResult<InventoryLocationReadDto>> GetById(int id)
    {
        var loc = await _db.InventoryLocations
            .AsNoTracking()
            .Where(l => l.Id == id)
            .Select(l => new InventoryLocationReadDto
            {
                Id = l.Id,
                Name = l.Name,
                Code = l.Code,
                Description = l.Description,
                IsActive = l.IsActive,
                CreatedAt = l.CreatedAt
            })
            .FirstOrDefaultAsync();

        if (loc is null) return NotFound();
        return Ok(loc);
    }

    // POST /api/inventory-locations
    [Authorize(Roles = "PartsClerk,Manager")]
    [HttpPost]
    public async Task<ActionResult<InventoryLocationReadDto>> Create([FromBody] InventoryLocationCreateDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("Name is required.");
        if (string.IsNullOrWhiteSpace(dto.Code)) return BadRequest("Code is required.");

        var code = dto.Code.Trim().ToUpperInvariant();
        var exists = await _db.InventoryLocations.AnyAsync(l => l.Code == code);
        if (exists) return Conflict($"Location code '{code}' already exists.");

        var loc = new InventoryLocation
        {
            Name = dto.Name.Trim(),
            Code = code,
            Description = dto.Description?.Trim() ?? "",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _db.InventoryLocations.Add(loc);
        await _db.SaveChangesAsync();

        var read = new InventoryLocationReadDto
        {
            Id = loc.Id,
            Name = loc.Name,
            Code = loc.Code,
            Description = loc.Description,
            IsActive = loc.IsActive,
            CreatedAt = loc.CreatedAt
        };

        return CreatedAtAction(nameof(GetById), new { id = loc.Id }, read);
    }

    // PUT /api/inventory-locations/{id}
    [Authorize(Roles = "PartsClerk,Manager")]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] InventoryLocationUpdateDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("Name is required.");
        if (string.IsNullOrWhiteSpace(dto.Code)) return BadRequest("Code is required.");

        var loc = await _db.InventoryLocations.FirstOrDefaultAsync(l => l.Id == id);
        if (loc is null) return NotFound();

        var code = dto.Code.Trim().ToUpperInvariant();

        if (!string.Equals(loc.Code, code, StringComparison.OrdinalIgnoreCase))
        {
            var taken = await _db.InventoryLocations.AnyAsync(l => l.Code == code && l.Id != id);
            if (taken) return Conflict($"Location code '{code}' already exists.");
        }

        loc.Name = dto.Name.Trim();
        loc.Code = code;
        loc.Description = dto.Description?.Trim() ?? "";
        loc.IsActive = dto.IsActive;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // DELETE /api/inventory-locations/{id} (soft delete)
    [Authorize(Roles = "PartsClerk,Manager")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var loc = await _db.InventoryLocations.FirstOrDefaultAsync(l => l.Id == id);
        if (loc is null) return NotFound();

        loc.IsActive = false;
        await _db.SaveChangesAsync();
        return NoContent();
    }
}