using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using RacingGarage.Data;
using RacingGarage.dto;
using RacingGarage.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace RacingGarage.Controllers;

[ApiController]
[Route("api/users")]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _cfg;
    private readonly PasswordHasher<AppUser> _hasher = new();

    public UsersController(AppDbContext db, IConfiguration cfg)
    {
        _db = db;
        _cfg = cfg;
    }

    private bool TryGetCurrentUserId(out int userId)
    {
        var idStr = User.FindFirstValue(ClaimTypes.NameIdentifier)
                    ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);

        return int.TryParse(idStr, out userId);
    }

    private static UserReadDto ToReadDto(AppUser u) => new()
    {
        Id = u.Id,
        FirstName = u.FirstName,
        LastName = u.LastName,
        Email = u.Email,
        IsActive = u.IsActive,
        CreatedAt = u.CreatedAt,
        Roles = u.UserRoles.Select(ur => ur.Role.Name).ToList()
    };

    private string MakeJwt(AppUser user)
    {
        var key = _cfg["Jwt:Key"];
        var issuer = _cfg["Jwt:Issuer"];
        var audience = _cfg["Jwt:Audience"];
        var expMinutesStr = _cfg["Jwt:ExpiresMinutes"];

        if (string.IsNullOrWhiteSpace(key))
            throw new InvalidOperationException("Missing config: Jwt:Key");
        if (string.IsNullOrWhiteSpace(issuer))
            throw new InvalidOperationException("Missing config: Jwt:Issuer");
        if (string.IsNullOrWhiteSpace(audience))
            throw new InvalidOperationException("Missing config: Jwt:Audience");

        var expMinutes = 720;
        if (!string.IsNullOrWhiteSpace(expMinutesStr) && int.TryParse(expMinutesStr, out var m))
            expMinutes = m;

        var roles = user.UserRoles.Select(ur => ur.Role.Name).ToList();

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(JwtRegisteredClaimNames.Name, $"{user.FirstName} {user.LastName}".Trim()),
        };

        foreach (var r in roles)
            claims.Add(new Claim(ClaimTypes.Role, r));

        var creds = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
            SecurityAlgorithms.HmacSha256
        );

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expMinutes),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

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
                FirstName = u.FirstName,
                LastName = u.LastName,
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
                FirstName = u.FirstName,
                LastName = u.LastName,
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
    [Authorize(Roles = "Manager")]
    [HttpPost]
    public async Task<ActionResult<UserReadDto>> Create([FromBody] UserCreateDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.FirstName)) return BadRequest("FirstName is required.");
        if (string.IsNullOrWhiteSpace(dto.LastName)) return BadRequest("LastName is required.");
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
            FirstName = dto.FirstName.Trim(),
            LastName = dto.LastName.Trim(),
            Email = email,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        user.PasswordHash = _hasher.HashPassword(user, dto.Password);

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        _db.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = role.Id });
        await _db.SaveChangesAsync();

        var read = new UserReadDto
        {
            Id = user.Id,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Email = user.Email,
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt,
            Roles = new List<string> { role.Name }
        };

        return CreatedAtAction(nameof(GetById), new { id = user.Id }, read);
    }

    // PUT /api/users/{id}/role
    [Authorize(Roles = "Manager")]
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
    [Authorize(Roles = "Manager")]
    [HttpPut("{id:int}/deactivate")]
    public async Task<IActionResult> Deactivate(int id)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user is null) return NotFound();

        user.IsActive = false;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // GET /api/users/me
    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<UserReadDto>> GetMe()
    {
        if (!TryGetCurrentUserId(out var currentUserId))
            return Unauthorized("Invalid token (missing user id).");

        var user = await _db.Users
            .AsNoTracking()
            .Where(u => u.Id == currentUserId)
            .Select(u => new UserReadDto
            {
                Id = u.Id,
                FirstName = u.FirstName,
                LastName = u.LastName,
                Email = u.Email,
                IsActive = u.IsActive,
                CreatedAt = u.CreatedAt,
                Roles = u.UserRoles.Select(ur => ur.Role.Name).ToList()
            })
            .FirstOrDefaultAsync();

        if (user is null) return NotFound();
        return Ok(user);
    }

    // PUT /api/users/me
    [Authorize]
    [HttpPut("me")]
    public async Task<ActionResult<object>> UpdateMe([FromBody] UserUpdateDto dto)
    {
        if (!TryGetCurrentUserId(out var currentUserId))
            return Unauthorized("Invalid token (missing user id).");

        if (string.IsNullOrWhiteSpace(dto.OldPassword))
            return BadRequest("OldPassword is required.");

        if (string.IsNullOrWhiteSpace(dto.FirstName))
            return BadRequest("FirstName is required.");

        if (string.IsNullOrWhiteSpace(dto.LastName))
            return BadRequest("LastName is required.");

        if (string.IsNullOrWhiteSpace(dto.Email))
            return BadRequest("Email is required.");

        var user = await _db.Users
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == currentUserId);

        if (user is null) return NotFound();

        var verify = _hasher.VerifyHashedPassword(user, user.PasswordHash ?? "", dto.OldPassword);
        if (verify == PasswordVerificationResult.Failed)
            return BadRequest("Old password is incorrect.");

        var nextEmail = dto.Email.Trim().ToLowerInvariant();

        var emailTaken = await _db.Users.AnyAsync(u => u.Id != user.Id && u.Email.ToLower() == nextEmail);
        if (emailTaken) return Conflict("A user with this email already exists.");

        user.FirstName = dto.FirstName.Trim();
        user.LastName = dto.LastName.Trim();
        user.Email = nextEmail;

        await _db.SaveChangesAsync();

        var token = MakeJwt(user);
        var read = ToReadDto(user);

        return Ok(new { token, user = read });
    }

    // PUT /api/users/me/password
    [Authorize]
    [HttpPut("me/password")]
    public async Task<ActionResult<object>> ChangeMyPassword([FromBody] UserChangePasswordDto dto)
    {
        if (!TryGetCurrentUserId(out var currentUserId))
            return Unauthorized("Invalid token (missing user id).");

        if (string.IsNullOrWhiteSpace(dto.OldPassword))
            return BadRequest("OldPassword is required.");

        if (string.IsNullOrWhiteSpace(dto.NewPassword))
            return BadRequest("NewPassword is required.");

        if (dto.NewPassword.Trim().Length < 6)
            return BadRequest("NewPassword must be at least 6 characters.");

        var user = await _db.Users
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == currentUserId);

        if (user is null) return NotFound();

        var verify = _hasher.VerifyHashedPassword(user, user.PasswordHash ?? "", dto.OldPassword);
        if (verify == PasswordVerificationResult.Failed)
            return BadRequest("Old password is incorrect.");

        user.PasswordHash = _hasher.HashPassword(user, dto.NewPassword.Trim());
        await _db.SaveChangesAsync();

        var token = MakeJwt(user);
        var read = ToReadDto(user);

        return Ok(new { token, user = read });
    }
}