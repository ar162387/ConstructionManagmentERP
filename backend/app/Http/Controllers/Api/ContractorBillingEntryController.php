<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ContractorBillingEntry;
use App\Models\ContractorPayment;
use App\Services\AuditService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ContractorBillingEntryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', ContractorBillingEntry::class);

        $validated = $request->validate([
            'project_id' => ['required', 'exists:projects,id'],
            'month' => ['nullable', 'date_format:Y-m'],
            'contractor_id' => ['nullable', 'exists:contractors,id'],
        ]);

        $projectId = (int) $validated['project_id'];
        $month = $validated['month'] ?? Carbon::now()->format('Y-m');
        $contractorId = isset($validated['contractor_id']) ? (int) $validated['contractor_id'] : null;

        $user = $request->user();
        if ($user->role === 'site_manager') {
            $allowed = $user->assignedProjects()->where('projects.id', $projectId)->exists();
            if (! $allowed) {
                return response()->json(['data' => [], 'kpis' => ['totalBilled' => 0, 'totalPaid' => 0, 'remaining' => 0]]);
            }
        }

        [$start, $end] = $this->monthRange($month);

        $query = ContractorBillingEntry::query()
            ->where('project_id', $projectId)
            ->whereBetween('entry_date', [$start, $end])
            ->with('contractor:id,name,project_id');

        if ($contractorId) {
            $query->where('contractor_id', $contractorId);
        }

        $entries = $query->orderBy('entry_date')->orderBy('id')->get();

        $contractorIdsInScope = $entries->pluck('contractor_id')->unique()->values()->all();
        $totalBilled = (float) $entries->sum('amount');

        $paymentsQuery = ContractorPayment::query()
            ->whereIn('contractor_id', $contractorIdsInScope ?: [0])
            ->whereBetween('payment_date', [$start, $end]);
        if ($contractorId) {
            $paymentsQuery->where('contractor_id', $contractorId);
        }
        $totalPaid = (float) $paymentsQuery->sum('amount');
        $remaining = $totalBilled - $totalPaid;

        return response()->json([
            'data' => $entries->map(fn (ContractorBillingEntry $e) => $this->formatEntry($e)),
            'kpis' => [
                'totalBilled' => round($totalBilled, 2),
                'totalPaid' => round($totalPaid, 2),
                'remaining' => round($remaining, 2),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', ContractorBillingEntry::class);

        $validated = $request->validate([
            'project_id' => ['required', 'exists:projects,id'],
            'contractor_id' => ['required', 'exists:contractors,id'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'remarks' => ['nullable', 'string', 'max:1000'],
            'entry_date' => ['required', 'date'],
        ]);

        $projectId = (int) $validated['project_id'];
        $contractorId = (int) $validated['contractor_id'];

        $contractor = \App\Models\Contractor::find($contractorId);
        if (! $contractor || $contractor->project_id != $projectId) {
            return response()->json([
                'message' => 'Contractor does not belong to this project.',
                'errors' => ['contractor_id' => ['Invalid contractor for project.']],
            ], 422);
        }

        if ($request->user()->role === 'site_manager') {
            $allowed = $request->user()->assignedProjects()->where('projects.id', $projectId)->exists();
            if (! $allowed) {
                return response()->json(['message' => 'You do not have access to this project.'], 403);
            }
        }

        $entry = ContractorBillingEntry::create([
            'project_id' => $projectId,
            'contractor_id' => $contractorId,
            'amount' => $validated['amount'],
            'remarks' => $validated['remarks'] ?? null,
            'entry_date' => $validated['entry_date'],
            'created_by' => $request->user()->id,
        ]);

        $fresh = $entry->fresh('contractor');

        AuditService::log(
            $request->user(),
            'create',
            'ContractorBillingEntry',
            (int) $fresh->id,
            null,
            $this->formatEntry($fresh),
            'ContractorBilling',
            "Created billing entry #{$fresh->id} for contractor {$contractor->name}",
            $request
        );

        return response()->json(['data' => $this->formatEntry($fresh)], 201);
    }

    public function show(Request $request, ContractorBillingEntry $contractorBillingEntry): JsonResponse
    {
        $this->authorize('view', $contractorBillingEntry);

        $contractorBillingEntry->load('contractor:id,name,project_id');

        return response()->json([
            'data' => $this->formatEntry($contractorBillingEntry),
        ]);
    }

    public function update(Request $request, ContractorBillingEntry $contractorBillingEntry): JsonResponse
    {
        $this->authorize('update', $contractorBillingEntry);

        $beforeData = $this->formatEntry($contractorBillingEntry);

        $validated = $request->validate([
            'amount' => ['sometimes', 'numeric', 'min:0.01'],
            'remarks' => ['nullable', 'string', 'max:1000'],
            'entry_date' => ['sometimes', 'date'],
        ]);

        $contractorBillingEntry->update($validated);
        $fresh = $contractorBillingEntry->fresh('contractor');

        AuditService::log(
            $request->user(),
            'update',
            'ContractorBillingEntry',
            (int) $fresh->id,
            $beforeData,
            $this->formatEntry($fresh),
            'ContractorBilling',
            "Updated billing entry #{$fresh->id}",
            $request
        );

        return response()->json(['data' => $this->formatEntry($fresh)]);
    }

    public function destroy(Request $request, ContractorBillingEntry $contractorBillingEntry): JsonResponse
    {
        $this->authorize('delete', $contractorBillingEntry);

        $beforeData = $this->formatEntry($contractorBillingEntry);
        $id = $contractorBillingEntry->id;

        $contractorBillingEntry->delete();

        AuditService::log(
            $request->user(),
            'delete',
            'ContractorBillingEntry',
            (int) $id,
            $beforeData,
            null,
            'ContractorBilling',
            "Deleted billing entry #{$id}",
            $request
        );

        return response()->json(null, 204);
    }

    /** @return array{0: string, 1: string} [start date, end date] */
    private function monthRange(string $month): array
    {
        $start = Carbon::parse($month . '-01')->startOfDay();
        $end = $start->copy()->endOfMonth();

        return [$start->format('Y-m-d'), $end->format('Y-m-d')];
    }

    private function formatEntry(ContractorBillingEntry $e): array
    {
        return [
            'id' => (string) $e->id,
            'projectId' => (string) $e->project_id,
            'contractorId' => (string) $e->contractor_id,
            'amount' => (float) $e->amount,
            'remarks' => $e->remarks,
            'entryDate' => $e->entry_date->format('Y-m-d'),
            'createdBy' => $e->created_by ? (string) $e->created_by : null,
            'createdAt' => $e->created_at->toISOString(),
            'contractor' => $e->relationLoaded('contractor') && $e->contractor
                ? ['id' => (string) $e->contractor->id, 'name' => $e->contractor->name]
                : null,
        ];
    }
}
