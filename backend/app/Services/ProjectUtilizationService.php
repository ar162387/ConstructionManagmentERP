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
        $total = 0.0;

        // Aggregate from expense sources when they exist
        // Only use vendor_invoice_payments when vendor_invoices is project-scoped (has project_id)
        if (Schema::hasTable('vendor_invoice_payments')
            && Schema::hasTable('vendor_invoices')
            && Schema::hasColumn('vendor_invoices', 'project_id')) {
            $total += (float) DB::table('vendor_invoice_payments')
                ->join('vendor_invoices', 'vendor_invoice_payments.vendor_invoice_id', '=', 'vendor_invoices.id')
                ->where('vendor_invoices.project_id', $project->id)
                ->sum('vendor_invoice_payments.amount');
        }

        if (Schema::hasTable('expenses')) {
            $total += (float) DB::table('expenses')
                ->where('project_id', $project->id)
                ->sum('amount');
        }

        return round($total, 2);
    }
}
