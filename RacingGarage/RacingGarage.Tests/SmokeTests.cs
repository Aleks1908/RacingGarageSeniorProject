using System.Net;
using FluentAssertions;

namespace RacingGarage.Tests;

public class SmokeTests : IClassFixture<TestAppFactory>
{
    private readonly HttpClient _client;

    public SmokeTests(TestAppFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task App_starts_and_responds()
    {
        var res = await _client.GetAsync("/api/parts");

        res.StatusCode.Should().NotBe(HttpStatusCode.NotFound);
    }
}