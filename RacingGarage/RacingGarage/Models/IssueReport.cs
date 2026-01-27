namespace RacingGarage.Models;

public class IssueReport
{
    public int Id { get; set; }

    public int TeamCarId { get; set; }
    public TeamCar TeamCar { get; set; } = null!;

    public int? CarSessionId { get; set; }
    public CarSession? CarSession { get; set; }

    public int ReportedByUserId { get; set; }
    public AppUser ReportedByUser { get; set; } = null!;

    public int? LinkedWorkOrderId { get; set; }
    public WorkOrder? LinkedWorkOrder { get; set; }

    public string Title { get; set; } = "";
    public string Description { get; set; } = "";

    public string Severity { get; set; } = "Medium";
    public string Status { get; set; } = "Open";

    public DateTime ReportedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ClosedAt { get; set; }
}