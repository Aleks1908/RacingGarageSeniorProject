using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using RacingGarage.Data;

namespace RacingGarage.Tests;

public sealed class TestAppFactory : WebApplicationFactory<Program>
{
    private SqliteConnection? _connection;

    public const string TestAuthScheme = "TestAuth";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureAppConfiguration((ctx, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Issuer"] = "test-issuer",
                ["Jwt:Audience"] = "test-audience",
                ["Jwt:Key"] = "f3\"fU7$r82}Lm9lrNJ0}fMD]Ozp4W7Gx",
            });
        });

        builder.ConfigureServices(services =>
        {
            services.RemoveAll(typeof(DbContextOptions<AppDbContext>));
            services.RemoveAll(typeof(DbContextOptions));
            services.RemoveAll(typeof(AppDbContext));

            services.RemoveAll(typeof(IDbContextOptionsConfiguration<AppDbContext>));
            services.RemoveAll(typeof(IConfigureOptions<DbContextOptions<AppDbContext>>));
            services.RemoveAll(typeof(IDbContextFactory<AppDbContext>));

            _connection = new SqliteConnection("Data Source=:memory:;Cache=Shared");
            _connection.Open();

            services.AddDbContext<AppDbContext>(options =>
            {
                options.UseSqlite(_connection);
                options.EnableSensitiveDataLogging();
            });

            services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = TestAuthScheme;
                options.DefaultChallengeScheme = TestAuthScheme;
            })
            .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(TestAuthScheme, _ => { });

            using var sp = services.BuildServiceProvider();
            using var scope = sp.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Database.EnsureCreated();
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);

        if (disposing)
        {
            _connection?.Dispose();
            _connection = null;
        }
    }

    private sealed class TestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
    {
        public TestAuthHandler(
            IOptionsMonitor<AuthenticationSchemeOptions> options,
            ILoggerFactory logger,
            UrlEncoder encoder
        ) : base(options, logger, encoder) { }

        protected override Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            if (!Request.Headers.TryGetValue("X-Test-Auth", out var auth) || auth != "true")
                return Task.FromResult(AuthenticateResult.NoResult());

            var userId = Request.Headers.TryGetValue("X-Test-UserId", out var uid) ? uid.ToString() : "1";
            var roles = Request.Headers.TryGetValue("X-Test-Roles", out var r) ? r.ToString() : "";

            var claims = new List<Claim>
            {
                new(ClaimTypes.NameIdentifier, userId),
                new(ClaimTypes.Name, $"test-user-{userId}")
            };

            foreach (var role in roles.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
                claims.Add(new Claim(ClaimTypes.Role, role));

            var identity = new ClaimsIdentity(claims, TestAuthScheme);
            var principal = new ClaimsPrincipal(identity);
            var ticket = new AuthenticationTicket(principal, TestAuthScheme);

            return Task.FromResult(AuthenticateResult.Success(ticket));
        }
    }
}