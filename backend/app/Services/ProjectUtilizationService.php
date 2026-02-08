<?php

namespace App\Services;

use App\Models\Project;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Computes utilized budget for projects by aggregating from expense sources.
 * No stored or cached values - always calculated at query time.
 */
class ProjectUtilizationService
{
    /**
     * Get the utilized (spent) budget for a project.
     * Aggregates from multiple expense-related tables.
     * Returns 0 when no expense sources exist yet.
     */
    public static function getUtilizedBudget(Project $project): float
    {
        $projectId = (int) $project->id;
        static $projectCache = [];
        if (array_key_exists($projectId, $projectCache)) {
            return $projectCache[$projectId];
        }

        $sources = self::detectExpenseSources();
        if (! $sources['vendor_invoice_payments_by_project'] && ! $sources['expenses']) {
            return $projectCache[$projectId] = 0.0;
        }

        $total = 0.0;

        // Aggregate from expense sources when they exist.
        if ($sources['vendor_invoice_payments_by_project']) {
            $total += (float) DB::table('vendor_invoice_payments')
                ->join('vendor_invoices', 'vendor_invoice_payments.vendor_invoice_id', '=', 'vendor_invoices.id')
                ->where('vendor_invoices.project_id', $project->id)
                ->sum('vendor_invoice_payments.amount');
        }

        if ($sources['expenses']) {
            $total += (float) DB::table('expenses')
                ->where('project_id', $project->id)
                ->sum('amount');
        }

        return $projectCache[$projectId] = round($total, 2);
    }

    /**
     * Detect available expense sources once per request to avoid repeated schema inspection queries.
     *
     * @return array{vendor_invoice_payments_by_project: bool, expenses: bool}
     */
    private static function detectExpenseSources(): array
    {
        static $sources = null;
        if ($sources !== null) {
            return $sources;
        }

        $hasVendorInvoicePayments = Schema::hasTable('vendor_invoice_payments');
        $hasVendorInvoices = Schema::hasTable('vendor_invoices');

        $sources = [
            'vendor_invoice_payments_by_project' => $hasVendorInvoicePayments
                && $hasVendorInvoices
                && Schema::hasColumn('vendor_invoices', 'project_id'),
            'expenses' => Schema::hasTable('expenses'),
        ];

        return $sources;
    }
}
