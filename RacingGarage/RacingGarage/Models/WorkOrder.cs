namespace RacingGarage.Models;

public class WorkOrder
{
    public int Id { get; set; }

    public int TeamCarId { get; set; }
    public TeamCar TeamCar { get; set; } = null!;

    public int CreatedByUserId { get; set; }
    public AppUser CreatedByUser { get; set; } = null!;

    public int? AssignedToUserId { get; set; }
    public AppUser? AssignedToUser { get; set; }

    public int? CarSessionId { get; set; }
    public CarSession? CarSession { get; set; }

    public string Title { get; set; } = "";
    public string Description { get; set; } = "";

    public string Priority { get; set; } = "Medium";
    public string Status { get; set; } = "Open";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DueDate { get; set; }
    public DateTime? ClosedAt { get; set; }

    public ICollection<WorkOrderTask> Tasks { get; set; } = new List<WorkOrderTask>();
}