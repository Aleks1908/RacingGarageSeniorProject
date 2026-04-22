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

            migrationBuilder.DropForeignKey(
                name: "FK_WorkOrders_IssueReports_LinkedIssueId",
                table: "WorkOrders");

            migrationBuilder.DropIndex(
                name: "IX_IssueReports_LinkedWorkOrderId",
                table: "IssueReports");

            migrationBuilder.DropIndex(
                name: "IX_WorkOrders_LinkedIssueId",
                table: "WorkOrders");

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
                name: "IX_WorkOrders_LinkedIssueId",
                table: "WorkOrders",
                column: "LinkedIssueId");

            migrationBuilder.CreateIndex(
                name: "IX_IssueReports_LinkedWorkOrderId",
                table: "IssueReports",
                column: "LinkedWorkOrderId");

            migrationBuilder.AddForeignKey(
                name: "FK_WorkOrders_IssueReports_LinkedIssueId",
                table: "WorkOrders",
                column: "LinkedIssueId",
                principalTable: "IssueReports",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

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
