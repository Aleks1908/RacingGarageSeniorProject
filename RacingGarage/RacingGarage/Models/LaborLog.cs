namespace RacingGarage.Models;

public class LaborLog
{
    public int Id { get; set; }

    public int WorkOrderTaskId { get; set; }
    public WorkOrderTask WorkOrderTask { get; set; } = null!;

    public int MechanicUserId { get; set; }
    public AppUser MechanicUser { get; set; } = null!;

    public int Minutes { get; set; } 
    public DateOnly LogDate { get; set; }
    public string Comment { get; set; } = "";
}