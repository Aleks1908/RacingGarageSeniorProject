namespace RacingGarage.Tests;

public static class TestClientAuthExtensions
{
    public static HttpClient AsAnonymous(this HttpClient client)
    {
        client.DefaultRequestHeaders.Remove("X-Test-Auth");
        client.DefaultRequestHeaders.Remove("X-Test-UserId");
        client.DefaultRequestHeaders.Remove("X-Test-Roles");
        return client;
    }

    public static HttpClient AsUser(this HttpClient client, int userId = 1, params string[] roles)
    {
        client.DefaultRequestHeaders.Remove("X-Test-Auth");
        client.DefaultRequestHeaders.Remove("X-Test-UserId");
        client.DefaultRequestHeaders.Remove("X-Test-Roles");

        client.DefaultRequestHeaders.Add("X-Test-Auth", "true");
        client.DefaultRequestHeaders.Add("X-Test-UserId", userId.ToString());
        if (roles.Length > 0)
            client.DefaultRequestHeaders.Add("X-Test-Roles", string.Join(",", roles));

        return client;
    }
}