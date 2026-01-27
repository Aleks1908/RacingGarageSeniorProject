using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RacingGarage.Data;
using RacingGarage.Dto;
using RacingGarage.Models;

namespace RacingGarage.Controllers;

[ApiController]
[Route("api/team-cars")]
public class TeamCarsController : ControllerBase
{
    private readonly AppDbContext _db;

    public TeamCarsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<List<TeamCarReadDto>>> GetAll()
    {
        var cars = await _db.TeamCars
            .AsNoTracking()
            .OrderBy(c => c.CarNumber)
            .Select(c => new TeamCarReadDto
            {
                Id = c.Id,
                CarNumber = c.CarNumber,
                Nickname = c.Nickname,
                Make = c.Make,
                Model = c.Model,
                Year = c.Year,
                CarClass = c.CarClass,
                Status = c.Status,
                OdometerKm = c.OdometerKm,
                CreatedAt = c.CreatedAt
            })
            .ToListAsync();

        return Ok(cars);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<TeamCarReadDto>> GetById(int id)
    {
        var car = await _db.TeamCars
            .AsNoTracking()
            .Where(c => c.Id == id)
            .Select(c => new TeamCarReadDto
            {
                Id = c.Id,
                CarNumber = c.CarNumber,
                Nickname = c.Nickname,
                Make = c.Make,
                Model = c.Model,
                Year = c.Year,
                CarClass = c.CarClass,
                Status = c.Status,
                OdometerKm = c.OdometerKm,
                CreatedAt = c.CreatedAt
            })
            .FirstOrDefaultAsync();

        if (car is null) return NotFound();
        return Ok(car);
    }

    [HttpPost]
    public async Task<ActionResult<TeamCarReadDto>> Create([FromBody] TeamCarCreateDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.CarNumber))
            return BadRequest("CarNumber is required.");

        var exists = await _db.TeamCars.AnyAsync(c => c.CarNumber == dto.CarNumber);
        if (exists) return Conflict($"Car with CarNumber '{dto.CarNumber}' already exists.");

        var car = new TeamCar
        {
            CarNumber = dto.CarNumber.Trim(),
            Nickname = dto.Nickname.Trim(),
            Make = dto.Make.Trim(),
            Model = dto.Model.Trim(),
            Year = dto.Year,
            CarClass = dto.CarClass.Trim(),
            Status = string.IsNullOrWhiteSpace(dto.Status) ? "Active" : dto.Status.Trim(),
            OdometerKm = dto.OdometerKm,
            CreatedAt = DateTime.UtcNow
        };

        _db.TeamCars.Add(car);
        await _db.SaveChangesAsync();

        var readDto = new TeamCarReadDto
        {
            Id = car.Id,
            CarNumber = car.CarNumber,
            Nickname = car.Nickname,
            Make = car.Make,
            Model = car.Model,
            Year = car.Year,
            CarClass = car.CarClass,
            Status = car.Status,
            OdometerKm = car.OdometerKm,
            CreatedAt = car.CreatedAt
        };

        return CreatedAtAction(nameof(GetById), new { id = car.Id }, readDto);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] TeamCarUpdateDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.CarNumber))
            return BadRequest("CarNumber is required.");

        var car = await _db.TeamCars.FirstOrDefaultAsync(c => c.Id == id);
        if (car is null) return NotFound();

        if (!string.Equals(car.CarNumber, dto.CarNumber, StringComparison.OrdinalIgnoreCase))
        {
            var numberTaken = await _db.TeamCars.AnyAsync(c => c.CarNumber == dto.CarNumber && c.Id != id);
            if (numberTaken) return Conflict($"Car with CarNumber '{dto.CarNumber}' already exists.");
        }

        car.CarNumber = dto.CarNumber.Trim();
        car.Nickname = dto.Nickname.Trim();
        car.Make = dto.Make.Trim();
        car.Model = dto.Model.Trim();
        car.Year = dto.Year;
        car.CarClass = dto.CarClass.Trim();
        car.Status = string.IsNullOrWhiteSpace(dto.Status) ? car.Status : dto.Status.Trim();
        car.OdometerKm = dto.OdometerKm;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var car = await _db.TeamCars.FirstOrDefaultAsync(c => c.Id == id);
        if (car is null) return NotFound();

        _db.TeamCars.Remove(car);
        await _db.SaveChangesAsync();

        return NoContent();
    }
}