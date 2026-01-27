using Microsoft.AspNetCore.Mvc;
using RacingGarage.Data;

namespace RacingGarage.Controllers;

[ApiController]
[Route("api/health")]
public class HealthController : ControllerBase
{
    private readonly AppDbContext _db;

    public HealthController(AppDbContext db) => _db = db;

    [HttpGet("db")]
    public async Task<IActionResult> Db()
    {
        var ok = await _db.Database.CanConnectAsync();
        return Ok(new { canConnect = ok });
    }
}