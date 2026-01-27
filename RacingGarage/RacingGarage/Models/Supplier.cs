namespace RacingGarage.Models;

public class Supplier
{
    public int Id { get; set; }

    public string Name { get; set; } = "";
    public string ContactEmail { get; set; } = "";
    public string Phone { get; set; } = "";

    public string AddressLine1 { get; set; } = "";
    public string AddressLine2 { get; set; } = "";
    public string City { get; set; } = "";
    public string Country { get; set; } = "";

    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}