using System.Text;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

namespace RacingGarage.Auth;

public static class AuthServiceCollectionExtensions
{
    public static void AddAppAuth(this IServiceCollection services, IConfiguration cfg, IWebHostEnvironment env)
    {
        if (env.IsEnvironment("Testing"))
        {
            services.AddAuthentication(TestingAuthHandler.Scheme)
                .AddScheme<AuthenticationSchemeOptions, TestingAuthHandler>(TestingAuthHandler.Scheme, _ => { });

            services.AddAuthorization(o => o.FallbackPolicy = o.DefaultPolicy);
            return;
        }

        var jwtIssuer = cfg["Jwt:Issuer"];
        var jwtAudience = cfg["Jwt:Audience"];
        var jwtKey = cfg["Jwt:Key"];

        if (string.IsNullOrWhiteSpace(jwtKey))
            throw new InvalidOperationException("Jwt:Key is not configured.");

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(o =>
            {
                o.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = jwtIssuer,

                    ValidateAudience = true,
                    ValidAudience = jwtAudience,

                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),

                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.FromMinutes(1)
                };
            });

        services.AddAuthorization(o => o.FallbackPolicy = o.DefaultPolicy);
    }
}