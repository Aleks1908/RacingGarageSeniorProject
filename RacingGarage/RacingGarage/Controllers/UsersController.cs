using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RacingGarage.Data;
using RacingGarage.dto;
using RacingGarage.Models;

namespace RacingGarage.Controllers;

[ApiController]
[Route("api/users")]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly PasswordHasher<AppUser> _hasher = new();

    public UsersController(AppDbContext db) => _db = db;

    // GET /api/users
    [HttpGet]
    public async Task<ActionResult<List<UserReadDto>>> GetAll()
    {
        var users = await _db.Users
            .AsNoTracking()
            .OrderBy(u => u.Id)
            .Select(u => new UserReadDto
            {
                Id = u.Id,
                Name = u.Name,
                Email = u.Email,
                IsActive = u.IsActive,
                CreatedAt = u.CreatedAt,
                Roles = u.UserRoles.Select(ur => ur.Role.Name).ToList()
            })
            .ToListAsync();

        return Ok(users);
    }

    // GET /api/users/{id}
    [HttpGet("{id:int}")]
    public async Task<ActionResult<UserReadDto>> GetById(int id)
    {
        var user = await _db.Users
            .AsNoTracking()
            .Where(u => u.Id == id)
            .Select(u => new UserReadDto
            {
                Id = u.Id,
                Name = u.Name,
                Email = u.Email,
                IsActive = u.IsActive,
                CreatedAt = u.CreatedAt,
                Roles = u.UserRoles.Select(ur => ur.Role.Name).ToList()
            })
            .FirstOrDefaultAsync();

        if (user is null) return NotFound();
        return Ok(user);
    }

    // POST /api/users
    // TODO: lock this behind Manager-only authorization.
    [HttpPost]
    public async Task<ActionResult<UserReadDto>> Create([FromBody] UserCreateDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("Name is required.");
        if (string.IsNullOrWhiteSpace(dto.Email)) return BadRequest("Email is required.");
        if (string.IsNullOrWhiteSpace(dto.Password)) return BadRequest("Password is required.");
        if (string.IsNullOrWhiteSpace(dto.Role)) return BadRequest("Role is required.");

        var email = dto.Email.Trim().ToLowerInvariant();
        var roleName = dto.Role.Trim();
        
        var emailTaken = await _db.Users.AnyAsync(u => u.Email.ToLower() == email);
        if (emailTaken) return Conflict("A user with this email already exists.");
        
        var role = await _db.Roles.FirstOrDefaultAsync(r => r.Name == roleName);
        if (role is null) return BadRequest($"Role '{roleName}' does not exist.");
        
        var user = new AppUser
        {
            Name = dto.Name.Trim(),
            Email = email,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        user.PasswordHash = _hasher.HashPassword(user, dto.Password);

        _db.Users.Add(user);
        await _db.SaveChangesAsync();
        
        _db.UserRoles.Add(new UserRole
        {
            UserId = user.Id,
            RoleId = role.Id
        });

        await _db.SaveChangesAsync();

        var read = new UserReadDto
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt,
            Roles = new List<string> { role.Name }
        };

        return CreatedAtAction(nameof(GetById), new { id = user.Id }, read);
    }
    
    // PUT /api/users/{id}/role
    // TODO: lock this behind Manager-only authorization.
    [HttpPut("{id:int}/role")]
    public async Task<IActionResult> SetRole(int id, [FromBody] UserSetRoleDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Role))
            return BadRequest("Role is required.");

        var roleName = dto.Role.Trim();

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user is null) return NotFound();

        var role = await _db.Roles.FirstOrDefaultAsync(r => r.Name == roleName);
        if (role is null) return BadRequest($"Role '{roleName}' does not exist.");
        
        var existing = await _db.UserRoles.Where(ur => ur.UserId == id).ToListAsync();
        if (existing.Count > 0)
            _db.UserRoles.RemoveRange(existing);

        _db.UserRoles.Add(new UserRole { UserId = id, RoleId = role.Id });

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // PUT /api/users/{id}/deactivate
    // TODO: lock this behind Manager-only authorization.
    [HttpPut("{id:int}/deactivate")]
    public async Task<IActionResult> Deactivate(int id)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user is null) return NotFound();

        user.IsActive = false;
        await _db.SaveChangesAsync();
        return NoContent();
    }
}