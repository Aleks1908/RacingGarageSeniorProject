using FluentAssertions;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using RacingGarage.Auth;

namespace RacingGarage.Tests.Auth;

public class AuthServiceCollectionExtensionsTests
{
    [Fact]
    public void AddAppAuth_in_Testing_registers_Test_scheme_and_fallback_policy()
    {
        var services = new ServiceCollection();
        var cfg = BuildConfig(new Dictionary<string, string?>());
        var env = new FakeWebHostEnvironment { EnvironmentName = "Testing" };

        services.AddAppAuth(cfg, env);
        using var sp = services.BuildServiceProvider();

        var schemeProvider = sp.GetRequiredService<IAuthenticationSchemeProvider>();
        var scheme = schemeProvider.GetSchemeAsync(TestingAuthHandler.Scheme).GetAwaiter().GetResult();
        scheme.Should().NotBeNull();

        var authz = sp.GetRequiredService<IOptions<AuthorizationOptions>>().Value;
        authz.FallbackPolicy.Should().NotBeNull();
    }

    [Fact]
    public void AddAppAuth_in_nonTesting_missing_key_throws()
    {
        var services = new ServiceCollection();
        var cfg = BuildConfig(new Dictionary<string, string?>
        {
            ["Jwt:Issuer"] = "issuer",
            ["Jwt:Audience"] = "audience",
            ["Jwt:Key"] = ""
        });
        var env = new FakeWebHostEnvironment { EnvironmentName = Environments.Production };

        var act = () => services.AddAppAuth(cfg, env);

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*Jwt:Key*");
    }

    [Fact]
    public void AddAppAuth_in_nonTesting_configures_Bearer_and_executes_JwtBearerOptions_lambda()
    {
        var services = new ServiceCollection();
        var cfg = BuildConfig(new Dictionary<string, string?>
        {
            ["Jwt:Issuer"] = "issuer-1",
            ["Jwt:Audience"] = "aud-1",
            ["Jwt:Key"] = "super-secret-key-super-secret-key"
        });
        var env = new FakeWebHostEnvironment { EnvironmentName = Environments.Production };

        services.AddAppAuth(cfg, env);
        using var sp = services.BuildServiceProvider();

        var jwtOptionsMonitor = sp.GetRequiredService<IOptionsMonitor<JwtBearerOptions>>();
        var jwtOptions = jwtOptionsMonitor.Get(JwtBearerDefaults.AuthenticationScheme);

        jwtOptions.TokenValidationParameters.Should().NotBeNull();
        var tvp = jwtOptions.TokenValidationParameters;

        tvp.ValidateIssuer.Should().BeTrue();
        tvp.ValidIssuer.Should().Be("issuer-1");

        tvp.ValidateAudience.Should().BeTrue();
        tvp.ValidAudience.Should().Be("aud-1");

        tvp.ValidateIssuerSigningKey.Should().BeTrue();
        tvp.IssuerSigningKey.Should().BeAssignableTo<SymmetricSecurityKey>();

        tvp.ValidateLifetime.Should().BeTrue();
        tvp.ClockSkew.Should().Be(TimeSpan.FromMinutes(1));

        var authz = sp.GetRequiredService<IOptions<AuthorizationOptions>>().Value;
        authz.FallbackPolicy.Should().NotBeNull();
    }

    private static IConfiguration BuildConfig(Dictionary<string, string?> values)
        => new ConfigurationBuilder()
            .AddInMemoryCollection(values!)
            .Build();

    private sealed class FakeWebHostEnvironment : IWebHostEnvironment
    {
        public string ApplicationName { get; set; } = "TestApp";
        public IFileProvider WebRootFileProvider { get; set; } = default!;
        public string WebRootPath { get; set; } = "";
        public string EnvironmentName { get; set; } = Environments.Production;
        public string ContentRootPath { get; set; } = "";
        public IFileProvider ContentRootFileProvider { get; set; } = default!;
    }
}