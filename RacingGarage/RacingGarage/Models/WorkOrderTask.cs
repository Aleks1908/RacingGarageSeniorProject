namespace RacingGarage.Models;

public class WorkOrderTask
{
    public int Id { get; set; }

    public int WorkOrderId { get; set; }
    public WorkOrder WorkOrder { get; set; } = null!;

    public string Title { get; set; } = "";
    public string Description { get; set; } = "";

    public string Status { get; set; } = "Todo";
    public int SortOrder { get; set; }

    public int? EstimatedMinutes { get; set; }
    public DateTime? CompletedAt { get; set; }

    public ICollection<LaborLog> LaborLogs { get; set; } = new List<LaborLog>();
}