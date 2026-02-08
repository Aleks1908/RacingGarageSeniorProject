using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RacingGarage.Data;
using RacingGarage.dto;
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

    [Authorize(Roles = "Manager")]
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

    [Authorize(Roles = "Manager")]
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

    [Authorize(Roles = "Manager")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var car = await _db.TeamCars.FirstOrDefaultAsync(c => c.Id == id);
        if (car is null) return NotFound();

        _db.TeamCars.Remove(car);
        await _db.SaveChangesAsync();

        return NoContent();
    }
    
    // GET /api/team-cars/{id}/dashboard
    [HttpGet("{id:int}/dashboard")]
    public async Task<ActionResult<TeamCarDashboardDto>> GetDashboard(int id)
    {
        var car = await _db.TeamCars
            .AsNoTracking()
            .Where(c => c.Id == id)
            .Select(c => new TeamCarSummaryDto
            {
                Id = c.Id,
                CarNumber = c.CarNumber,
                Make = c.Make,
                Model = c.Model,
                Year = c.Year,
                Status = c.Status
            })
            .FirstOrDefaultAsync();

        if (car is null) return NotFound();
        
        var latestSession = await _db.CarSessions
            .AsNoTracking()
            .Where(s => s.TeamCarId == id)
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
                DriverName = s.DriverUserId != null ? s.DriverUser!.Name : null,

                Laps = s.Laps,
                Notes = s.Notes
            })
            .FirstOrDefaultAsync();

        var openIssues = await _db.IssueReports
            .AsNoTracking()
            .Where(i => i.TeamCarId == id && i.Status != "Closed")
            .OrderByDescending(i => i.ReportedAt)
            .Select(i => new IssueReportReadDto
            {
                Id = i.Id,
                TeamCarId = i.TeamCarId,
                TeamCarNumber = i.TeamCar.CarNumber,
                CarSessionId = i.CarSessionId,
                ReportedByUserId = i.ReportedByUserId,
                ReportedByName = i.ReportedByUser.Name,
                LinkedWorkOrderId = i.LinkedWorkOrderId,
                Title = i.Title,
                Description = i.Description,
                Severity = i.Severity,
                Status = i.Status,
                ReportedAt = i.ReportedAt,
                ClosedAt = i.ClosedAt
            })
            .ToListAsync();

        var openWos = await _db.WorkOrders
            .AsNoTracking()
            .Where(w => w.TeamCarId == id && w.Status != "Closed")
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

        return Ok(new TeamCarDashboardDto
        {
            Car = car,
            LatestSession = latestSession,
            OpenIssues = openIssues,
            OpenWorkOrders = openWos
        });
    }
}