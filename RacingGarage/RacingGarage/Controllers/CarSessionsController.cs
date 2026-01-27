using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RacingGarage.Data;
using RacingGarage.dto;
using RacingGarage.Models;

namespace RacingGarage.Controllers;

[ApiController]
[Route("api/car-sessions")]
public class CarSessionsController : ControllerBase
{
    private readonly AppDbContext _db;

    public CarSessionsController(AppDbContext db) => _db = db;

    // GET /api/car-sessions
    [HttpGet]
    public async Task<ActionResult<List<CarSessionReadDto>>> GetAll()
    {
        var sessions = await _db.CarSessions
            .AsNoTracking()
            .OrderByDescending(s => s.Date)
            .ThenByDescending(s => s.Id)
            .Select(s => new CarSessionReadDto
            {
                Id = s.Id,
                TeamCarId = s.TeamCarId,
                TeamCarNumber = s.TeamCar.CarNumber,
                SessionType = s.SessionType,
                Date = s.Date,
                TrackName = s.TrackName,
                DriverUserId = s.DriverUserId,
                DriverName = s.DriverUser != null ? s.DriverUser.Name : null,
                Laps = s.Laps,
                Notes = s.Notes
            })
            .ToListAsync();

        return Ok(sessions);
    }

    // GET /api/car-sessions/{id}
    [HttpGet("{id:int}")]
    public async Task<ActionResult<CarSessionReadDto>> GetById(int id)
    {
        var session = await _db.CarSessions
            .AsNoTracking()
            .Where(s => s.Id == id)
            .Select(s => new CarSessionReadDto
            {
                Id = s.Id,
                TeamCarId = s.TeamCarId,
                TeamCarNumber = s.TeamCar.CarNumber,
                SessionType = s.SessionType,
                Date = s.Date,
                TrackName = s.TrackName,
                DriverUserId = s.DriverUserId,
                DriverName = s.DriverUser != null ? s.DriverUser.Name : null,
                Laps = s.Laps,
                Notes = s.Notes
            })
            .FirstOrDefaultAsync();

        if (session is null) return NotFound();
        return Ok(session);
    }

    // POST /api/car-sessions
    [HttpPost]
    public async Task<ActionResult<CarSessionReadDto>> Create([FromBody] CarSessionCreateDto dto)
    {
        // Validation
        if (dto.TeamCarId <= 0) return BadRequest("TeamCarId must be a positive integer.");
        if (string.IsNullOrWhiteSpace(dto.TrackName)) return BadRequest("TrackName is required.");
        if (dto.Laps < 0) return BadRequest("Laps cannot be negative.");

        var carExists = await _db.TeamCars.AnyAsync(c => c.Id == dto.TeamCarId);
        if (!carExists) return BadRequest($"TeamCarId '{dto.TeamCarId}' does not exist.");

        if (dto.DriverUserId.HasValue)
        {
            var userExists = await _db.Users.AnyAsync(u => u.Id == dto.DriverUserId.Value);
            if (!userExists) return BadRequest($"DriverUserId '{dto.DriverUserId.Value}' does not exist.");
        }

        var session = new CarSession
        {
            TeamCarId = dto.TeamCarId,
            SessionType = string.IsNullOrWhiteSpace(dto.SessionType) ? "Practice" : dto.SessionType.Trim(),
            Date = dto.Date,
            TrackName = dto.TrackName.Trim(),
            DriverUserId = dto.DriverUserId,
            Laps = dto.Laps,
            Notes = dto.Notes?.Trim() ?? ""
        };

        _db.CarSessions.Add(session);
        await _db.SaveChangesAsync();

        // Return Read DTO
        var created = await _db.CarSessions
            .AsNoTracking()
            .Where(s => s.Id == session.Id)
            .Select(s => new CarSessionReadDto
            {
                Id = s.Id,
                TeamCarId = s.TeamCarId,
                TeamCarNumber = s.TeamCar.CarNumber,
                SessionType = s.SessionType,
                Date = s.Date,
                TrackName = s.TrackName,
                DriverUserId = s.DriverUserId,
                DriverName = s.DriverUser != null ? s.DriverUser.Name : null,
                Laps = s.Laps,
                Notes = s.Notes
            })
            .FirstAsync();

        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    // PUT /api/car-sessions/{id}
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] CarSessionUpdateDto dto)
    {
        if (dto.TeamCarId <= 0) return BadRequest("TeamCarId must be a positive integer.");
        if (string.IsNullOrWhiteSpace(dto.TrackName)) return BadRequest("TrackName is required.");
        if (dto.Laps < 0) return BadRequest("Laps cannot be negative.");

        var session = await _db.CarSessions.FirstOrDefaultAsync(s => s.Id == id);
        if (session is null) return NotFound();

        var carExists = await _db.TeamCars.AnyAsync(c => c.Id == dto.TeamCarId);
        if (!carExists) return BadRequest($"TeamCarId '{dto.TeamCarId}' does not exist.");

        if (dto.DriverUserId.HasValue)
        {
            var userExists = await _db.Users.AnyAsync(u => u.Id == dto.DriverUserId.Value);
            if (!userExists) return BadRequest($"DriverUserId '{dto.DriverUserId.Value}' does not exist.");
        }

        session.TeamCarId = dto.TeamCarId;
        session.SessionType = string.IsNullOrWhiteSpace(dto.SessionType) ? session.SessionType : dto.SessionType.Trim();
        session.Date = dto.Date;
        session.TrackName = dto.TrackName.Trim();
        session.DriverUserId = dto.DriverUserId;
        session.Laps = dto.Laps;
        session.Notes = dto.Notes?.Trim() ?? "";

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // DELETE /api/car-sessions/{id}
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var session = await _db.CarSessions.FirstOrDefaultAsync(s => s.Id == id);
        if (session is null) return NotFound();

        _db.CarSessions.Remove(session);
        await _db.SaveChangesAsync();

        return NoContent();
    }
}