using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Xunit;

namespace RacingGarage.Tests.Health;

public class HealthApiTests : IClassFixture<TestAppFactory>
{
    private readonly TestAppFactory _factory;

    public HealthApiTests(TestAppFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Db_health_endpoint_is_anonymous_and_returns_200()
    {
        var client = _factory.CreateClient().AsAnonymous();
        var res = await client.GetAsync("/api/health/db");

        res.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Db_health_endpoint_returns_canConnect_true()
    {
        var client = _factory.CreateClient().AsAnonymous();
        var res = await client.GetAsync("/api/health/db");

        res.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await res.Content.ReadFromJsonAsync<HealthDbResponse>();

        body.Should().NotBeNull();
        body!.CanConnect.Should().BeTrue();
    }

    private sealed class HealthDbResponse
    {
        public bool CanConnect { get; set; }
    }
}