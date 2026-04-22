using System.Diagnostics.CodeAnalysis;


using Microsoft.EntityFrameworkCore;
using RacingGarage.Auth;
using RacingGarage.Data;

var builder = WebApplication.CreateBuilder(args);

// MySQL connection
var cs = builder.Configuration.GetConnectionString("Default");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(cs, ServerVersion.AutoDetect(cs)));

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// CORS policy restricted to the Vite dev-server origin
builder.Services.AddCors(options =>
{
    options.AddPolicy("vite", p =>
        p.WithOrigins("http://localhost:5173", "https://localhost:5173")
            .AllowAnyHeader()
            .AllowAnyMethod());
});

// Registers JWT bearer auth and the testing bypass handler 
builder.Services.AddAppAuth(builder.Configuration, builder.Environment);

var app = builder.Build();

// In development: expose Swagger UI and run the DB seeder to populate roles, test users, and demo data
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();

    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    await db.Database.MigrateAsync();
    await DbSeeder.SeedRolesAsync(db);
    await DbSeeder.SeedTestUsersAsync(db);
    await DbSeeder.SeedDemoDataAsync(db);
}

// Middleware order: CORS must come before auth, auth before authorization
app.UseCors("vite");
app.UseAuthentication();
app.UseAuthorization();

app.UseHttpsRedirection();
app.MapControllers();
app.Run();

[ExcludeFromCodeCoverage]
public partial class Program { }