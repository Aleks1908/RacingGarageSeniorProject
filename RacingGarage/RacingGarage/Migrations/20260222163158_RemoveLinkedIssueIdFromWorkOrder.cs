﻿using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RacingGarage.Migrations
{
    /// <inheritdoc />
    public partial class RemoveLinkedIssueIdFromWorkOrder : Migration
    {
        /// <inheritdoc />
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_IssueReports_WorkOrders_LinkedWorkOrderId",
                table: "IssueReports");

            migrationBuilder.DropIndex(
                name: "IX_IssueReports_LinkedWorkOrderId",
                table: "IssueReports");

            migrationBuilder.DropColumn(
                name: "LinkedIssueId",
                table: "WorkOrders");

            migrationBuilder.CreateIndex(
                name: "IX_IssueReports_LinkedWorkOrderId",
                table: "IssueReports",
                column: "LinkedWorkOrderId",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_IssueReports_WorkOrders_LinkedWorkOrderId",
                table: "IssueReports",
                column: "LinkedWorkOrderId",
                principalTable: "WorkOrders",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_IssueReports_WorkOrders_LinkedWorkOrderId",
                table: "IssueReports");

            migrationBuilder.DropIndex(
                name: "IX_IssueReports_LinkedWorkOrderId",
                table: "IssueReports");

            migrationBuilder.AddColumn<int>(
                name: "LinkedIssueId",
                table: "WorkOrders",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_IssueReports_LinkedWorkOrderId",
                table: "IssueReports",
                column: "LinkedWorkOrderId");

            migrationBuilder.AddForeignKey(
                name: "FK_IssueReports_WorkOrders_LinkedWorkOrderId",
                table: "IssueReports",
                column: "LinkedWorkOrderId",
                principalTable: "WorkOrders",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
