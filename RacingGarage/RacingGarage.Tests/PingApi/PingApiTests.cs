using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Xunit;

namespace RacingGarage.Tests.Ping;

public class PingApiTests : IClassFixture<TestAppFactory>
{
    private readonly TestAppFactory _factory;

    public PingApiTests(TestAppFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Get_returns_200_and_pong_message_for_authenticated_user()
    {
        var client = _factory.CreateClient().AsUser(userId: 1, roles: "Driver");

        var res = await client.GetAsync("/api/ping");

        res.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await res.Content.ReadFromJsonAsync<PingResponse>();
        body.Should().NotBeNull();
        body!.Message.Should().Be("pong");
    }

    private sealed class PingResponse
    {
        public string? Message { get; set; }
    }
}