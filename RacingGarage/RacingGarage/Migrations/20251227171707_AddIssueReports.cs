using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RacingGarage.Migrations
{
    /// <inheritdoc />
    public partial class AddIssueReports : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "IssueReports",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    TeamCarId = table.Column<int>(type: "int", nullable: false),
                    CarSessionId = table.Column<int>(type: "int", nullable: true),
                    ReportedByUserId = table.Column<int>(type: "int", nullable: false),
                    LinkedWorkOrderId = table.Column<int>(type: "int", nullable: true),
                    Title = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Description = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Severity = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Status = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ReportedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    ClosedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IssueReports", x => x.Id);
                    table.ForeignKey(
                        name: "FK_IssueReports_CarSessions_CarSessionId",
                        column: x => x.CarSessionId,
                        principalTable: "CarSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_IssueReports_TeamCars_TeamCarId",
                        column: x => x.TeamCarId,
                        principalTable: "TeamCars",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_IssueReports_Users_ReportedByUserId",
                        column: x => x.ReportedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_IssueReports_WorkOrders_LinkedWorkOrderId",
                        column: x => x.LinkedWorkOrderId,
                        principalTable: "WorkOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_IssueReports_CarSessionId",
                table: "IssueReports",
                column: "CarSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_IssueReports_LinkedWorkOrderId",
                table: "IssueReports",
                column: "LinkedWorkOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_IssueReports_ReportedByUserId",
                table: "IssueReports",
                column: "ReportedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_IssueReports_TeamCarId",
                table: "IssueReports",
                column: "TeamCarId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "IssueReports");
        }
    }
}
