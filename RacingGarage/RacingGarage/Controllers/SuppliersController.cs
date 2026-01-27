using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RacingGarage.Data;
using RacingGarage.dto;
using RacingGarage.Models;

namespace RacingGarage.Controllers;

[ApiController]
[Route("api/suppliers")]
public class SuppliersController : ControllerBase
{
    private readonly AppDbContext _db;

    public SuppliersController(AppDbContext db) => _db = db;

    // GET /api/suppliers
    [HttpGet]
    public async Task<ActionResult<List<SupplierReadDto>>> GetAll([FromQuery] bool? activeOnly)
    {
        var q = _db.Suppliers.AsNoTracking();

        if (activeOnly == true)
            q = q.Where(s => s.IsActive);

        var list = await q
            .OrderBy(s => s.Name)
            .Select(s => new SupplierReadDto
            {
                Id = s.Id,
                Name = s.Name,
                ContactEmail = s.ContactEmail,
                Phone = s.Phone,
                AddressLine1 = s.AddressLine1,
                AddressLine2 = s.AddressLine2,
                City = s.City,
                Country = s.Country,
                IsActive = s.IsActive,
                CreatedAt = s.CreatedAt
            })
            .ToListAsync();

        return Ok(list);
    }

    // GET /api/suppliers/{id}
    [HttpGet("{id:int}")]
    public async Task<ActionResult<SupplierReadDto>> GetById(int id)
    {
        var s = await _db.Suppliers
            .AsNoTracking()
            .Where(x => x.Id == id)
            .Select(x => new SupplierReadDto
            {
                Id = x.Id,
                Name = x.Name,
                ContactEmail = x.ContactEmail,
                Phone = x.Phone,
                AddressLine1 = x.AddressLine1,
                AddressLine2 = x.AddressLine2,
                City = x.City,
                Country = x.Country,
                IsActive = x.IsActive,
                CreatedAt = x.CreatedAt
            })
            .FirstOrDefaultAsync();

        if (s is null) return NotFound();
        return Ok(s);
    }

    // POST /api/suppliers
    [HttpPost]
    public async Task<ActionResult<SupplierReadDto>> Create([FromBody] SupplierCreateDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("Name is required.");

        var name = dto.Name.Trim();
        var exists = await _db.Suppliers.AnyAsync(s => s.Name == name);
        if (exists) return Conflict($"Supplier '{name}' already exists.");

        var supplier = new Supplier
        {
            Name = name,
            ContactEmail = dto.ContactEmail?.Trim() ?? "",
            Phone = dto.Phone?.Trim() ?? "",
            AddressLine1 = dto.AddressLine1?.Trim() ?? "",
            AddressLine2 = dto.AddressLine2?.Trim() ?? "",
            City = dto.City?.Trim() ?? "",
            Country = dto.Country?.Trim() ?? "",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _db.Suppliers.Add(supplier);
        await _db.SaveChangesAsync();

        var read = new SupplierReadDto
        {
            Id = supplier.Id,
            Name = supplier.Name,
            ContactEmail = supplier.ContactEmail,
            Phone = supplier.Phone,
            AddressLine1 = supplier.AddressLine1,
            AddressLine2 = supplier.AddressLine2,
            City = supplier.City,
            Country = supplier.Country,
            IsActive = supplier.IsActive,
            CreatedAt = supplier.CreatedAt
        };

        return CreatedAtAction(nameof(GetById), new { id = supplier.Id }, read);
    }

    // PUT /api/suppliers/{id}
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] SupplierUpdateDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("Name is required.");

        var supplier = await _db.Suppliers.FirstOrDefaultAsync(s => s.Id == id);
        if (supplier is null) return NotFound();

        var name = dto.Name.Trim();
        if (!string.Equals(supplier.Name, name, StringComparison.OrdinalIgnoreCase))
        {
            var taken = await _db.Suppliers.AnyAsync(s => s.Name == name && s.Id != id);
            if (taken) return Conflict($"Supplier '{name}' already exists.");
        }

        supplier.Name = name;
        supplier.ContactEmail = dto.ContactEmail?.Trim() ?? "";
        supplier.Phone = dto.Phone?.Trim() ?? "";
        supplier.AddressLine1 = dto.AddressLine1?.Trim() ?? "";
        supplier.AddressLine2 = dto.AddressLine2?.Trim() ?? "";
        supplier.City = dto.City?.Trim() ?? "";
        supplier.Country = dto.Country?.Trim() ?? "";
        supplier.IsActive = dto.IsActive;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // DELETE /api/suppliers/{id}
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var supplier = await _db.Suppliers.FirstOrDefaultAsync(s => s.Id == id);
        if (supplier is null) return NotFound();

        supplier.IsActive = false;
        await _db.SaveChangesAsync();

        return NoContent();
    }
}
