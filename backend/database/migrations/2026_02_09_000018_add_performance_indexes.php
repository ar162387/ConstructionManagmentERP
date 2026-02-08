<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->index('name', 'projects_name_idx');
        });

        Schema::table('vendors', function (Blueprint $table) {
            $table->index('name', 'vendors_name_idx');
        });

        Schema::table('consumable_items', function (Blueprint $table) {
            $table->index('name', 'consumable_items_name_idx');
            $table->index('unit_id', 'consumable_items_unit_id_idx');
        });

        Schema::table('vendor_invoices', function (Blueprint $table) {
            $table->index('vendor_id', 'vendor_invoices_vendor_id_idx');
            $table->index('created_by', 'vendor_invoices_created_by_idx');
            $table->index('invoice_date', 'vendor_invoices_invoice_date_idx');
            $table->index(['vendor_id', 'invoice_date'], 'vendor_inv_vendor_date_idx');
        });

        Schema::table('vendor_invoice_line_items', function (Blueprint $table) {
            $table->index('vendor_invoice_id', 'vi_line_items_invoice_id_idx');
            $table->index('consumable_item_id', 'vi_line_items_item_id_idx');
        });

        Schema::table('vendor_invoice_payments', function (Blueprint $table) {
            $table->index('vendor_invoice_id', 'vi_payments_invoice_id_idx');
            $table->index('created_by', 'vi_payments_created_by_idx');
            $table->index('date', 'vi_payments_date_idx');
        });

        Schema::table('stock_consumption_entries', function (Blueprint $table) {
            $table->index('project_id', 'stock_entries_project_id_idx');
            $table->index('created_by', 'stock_entries_created_by_idx');
            $table->index('created_at', 'stock_entries_created_at_idx');
        });

        Schema::table('stock_consumption_line_items', function (Blueprint $table) {
            $table->index('stock_consumption_entry_id', 'stock_line_items_entry_id_idx');
            $table->index('consumable_item_id', 'stock_line_items_item_id_idx');
        });

        Schema::table('receiving_entries', function (Blueprint $table) {
            $table->index('created_by', 'receiving_entries_created_by_idx');
            $table->index('created_at', 'receiving_entries_created_at_idx');
        });

        Schema::table('receiving_entry_line_items', function (Blueprint $table) {
            $table->index('receiving_entry_id', 'receiving_line_items_entry_id_idx');
            $table->index('non_consumable_item_id', 'receiving_line_items_item_id_idx');
        });

        Schema::table('non_consumable_movements', function (Blueprint $table) {
            $table->index('non_consumable_item_id', 'nc_moves_item_id_idx');
            $table->index('project_id', 'nc_moves_project_id_idx');
            $table->index('created_by', 'nc_moves_created_by_idx');
            $table->index('movement_type', 'nc_moves_type_idx');
            $table->index('created_at', 'nc_moves_created_at_idx');
        });

        Schema::table('contractors', function (Blueprint $table) {
            $table->index('project_id', 'contractors_project_id_idx');
            $table->index('name', 'contractors_name_idx');
        });

        Schema::table('contractor_billing_entries', function (Blueprint $table) {
            $table->index('project_id', 'contractor_billing_project_id_idx');
            $table->index('contractor_id', 'contractor_billing_contractor_id_idx');
            $table->index('entry_date', 'contractor_billing_entry_date_idx');
            $table->index('created_by', 'contractor_billing_created_by_idx');
        });

        Schema::table('contractor_payments', function (Blueprint $table) {
            $table->index('contractor_id', 'contractor_payments_contractor_id_idx');
            $table->index('payment_date', 'contractor_payments_payment_date_idx');
            $table->index('created_by', 'contractor_payments_created_by_idx');
        });
    }

    public function down(): void
    {
        Schema::table('contractor_payments', function (Blueprint $table) {
            $table->dropIndex('contractor_payments_contractor_id_idx');
            $table->dropIndex('contractor_payments_payment_date_idx');
            $table->dropIndex('contractor_payments_created_by_idx');
        });

        Schema::table('contractor_billing_entries', function (Blueprint $table) {
            $table->dropIndex('contractor_billing_project_id_idx');
            $table->dropIndex('contractor_billing_contractor_id_idx');
            $table->dropIndex('contractor_billing_entry_date_idx');
            $table->dropIndex('contractor_billing_created_by_idx');
        });

        Schema::table('contractors', function (Blueprint $table) {
            $table->dropIndex('contractors_project_id_idx');
            $table->dropIndex('contractors_name_idx');
        });

        Schema::table('non_consumable_movements', function (Blueprint $table) {
            $table->dropIndex('nc_moves_item_id_idx');
            $table->dropIndex('nc_moves_project_id_idx');
            $table->dropIndex('nc_moves_created_by_idx');
            $table->dropIndex('nc_moves_type_idx');
            $table->dropIndex('nc_moves_created_at_idx');
        });

        Schema::table('receiving_entry_line_items', function (Blueprint $table) {
            $table->dropIndex('receiving_line_items_entry_id_idx');
            $table->dropIndex('receiving_line_items_item_id_idx');
        });

        Schema::table('receiving_entries', function (Blueprint $table) {
            $table->dropIndex('receiving_entries_created_by_idx');
            $table->dropIndex('receiving_entries_created_at_idx');
        });

        Schema::table('stock_consumption_line_items', function (Blueprint $table) {
            $table->dropIndex('stock_line_items_entry_id_idx');
            $table->dropIndex('stock_line_items_item_id_idx');
        });

        Schema::table('stock_consumption_entries', function (Blueprint $table) {
            $table->dropIndex('stock_entries_project_id_idx');
            $table->dropIndex('stock_entries_created_by_idx');
            $table->dropIndex('stock_entries_created_at_idx');
        });

        Schema::table('vendor_invoice_payments', function (Blueprint $table) {
            $table->dropIndex('vi_payments_invoice_id_idx');
            $table->dropIndex('vi_payments_created_by_idx');
            $table->dropIndex('vi_payments_date_idx');
        });

        Schema::table('vendor_invoice_line_items', function (Blueprint $table) {
            $table->dropIndex('vi_line_items_invoice_id_idx');
            $table->dropIndex('vi_line_items_item_id_idx');
        });

        Schema::table('vendor_invoices', function (Blueprint $table) {
            $table->dropIndex('vendor_invoices_vendor_id_idx');
            $table->dropIndex('vendor_invoices_created_by_idx');
            $table->dropIndex('vendor_invoices_invoice_date_idx');
            $table->dropIndex('vendor_inv_vendor_date_idx');
        });

        Schema::table('consumable_items', function (Blueprint $table) {
            $table->dropIndex('consumable_items_name_idx');
            $table->dropIndex('consumable_items_unit_id_idx');
        });

        Schema::table('vendors', function (Blueprint $table) {
            $table->dropIndex('vendors_name_idx');
        });

        Schema::table('projects', function (Blueprint $table) {
            $table->dropIndex('projects_name_idx');
        });
    }
};
