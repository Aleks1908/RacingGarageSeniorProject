using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RacingGarage.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkOrderLinkedIssueFk : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_WorkOrders_LinkedIssueId",
                table: "WorkOrders",
                column: "LinkedIssueId");

            migrationBuilder.AddForeignKey(
                name: "FK_WorkOrders_IssueReports_LinkedIssueId",
                table: "WorkOrders",
                column: "LinkedIssueId",
                principalTable: "IssueReports",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_WorkOrders_IssueReports_LinkedIssueId",
                table: "WorkOrders");

            migrationBuilder.DropIndex(
                name: "IX_WorkOrders_LinkedIssueId",
                table: "WorkOrders");
        }
    }
}
