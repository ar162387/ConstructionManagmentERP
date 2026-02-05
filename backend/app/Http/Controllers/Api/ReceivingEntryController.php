<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\NonConsumableItem;
use App\Models\ReceivingEntry;
use App\Models\ReceivingEntryLineItem;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReceivingEntryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', ReceivingEntry::class);

        $entries = ReceivingEntry::query()
            ->with(['createdByUser', 'lineItems.nonConsumableItem'])
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'data' => $entries->map(fn (ReceivingEntry $e) => $this->formatEntry($e)),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', ReceivingEntry::class);

        $validated = $request->validate([
            'remarks' => ['nullable', 'string', 'max:1000'],
            'line_items' => ['required', 'array', 'min:1'],
            'line_items.*.non_consumable_item_id' => ['required', 'exists:non_consumable_items,id'],
            'line_items.*.quantity' => ['required', 'numeric', 'min:0.01'],
            'line_items.*.unit_cost' => ['nullable', 'numeric', 'min:0'],
            'line_items.*.line_total' => ['nullable', 'numeric', 'min:0'],
        ]);

        foreach ($validated['line_items'] as $i => $line) {
            $hasUnitCost = isset($line['unit_cost']) && $line['unit_cost'] !== '' && $line['unit_cost'] !== null;
            $hasLineTotal = isset($line['line_total']) && $line['line_total'] !== '' && $line['line_total'] !== null;
            if (! $hasUnitCost && ! $hasLineTotal) {
                return response()->json([
                    'message' => "Line " . ($i + 1) . ": provide either unit cost or line total.",
                    'errors' => ['line_items' => ['Each line must have unit_cost or line_total.']],
                ], 422);
            }
        }

        try {
            $entry = DB::transaction(function () use ($validated, $request) {
                $itemIds = array_unique(array_column($validated['line_items'], 'non_consumable_item_id'));
                NonConsumableItem::whereIn('id', $itemIds)->lockForUpdate()->get();

                $entry = ReceivingEntry::create([
                    'remarks' => $validated['remarks'] ?? null,
                    'created_by' => $request->user()->id,
                ]);

                foreach ($validated['line_items'] as $line) {
                    $quantity = (float) $line['quantity'];
                    $unitCost = null;
                    $lineTotal = null;

                    if (isset($line['unit_cost']) && $line['unit_cost'] !== '' && $line['unit_cost'] !== null) {
                        $unitCost = (float) $line['unit_cost'];
                        $lineTotal = $quantity * $unitCost;
                    } else {
                        $lineTotal = (float) $line['line_total'];
                        $unitCost = $quantity > 0 ? $lineTotal / $quantity : 0;
                    }

                    ReceivingEntryLineItem::create([
                        'receiving_entry_id' => $entry->id,
                        'non_consumable_item_id' => $line['non_consumable_item_id'],
                        'quantity' => $quantity,
                        'unit_cost' => $unitCost,
                        'line_total' => $lineTotal,
                    ]);

                    NonConsumableItem::where('id', $line['non_consumable_item_id'])
                        ->increment('store_qty', $quantity);
                }

                return $entry->fresh(['createdByUser', 'lineItems.nonConsumableItem']);
            });
        } catch (\Throwable $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'errors' => ['line_items' => [$e->getMessage()]],
            ], 422);
        }

        AuditService::log(
            $request->user(),
            'create',
            'ReceivingEntry',
            (int) $entry->id,
            null,
            $this->formatEntry($entry),
            'ReceivingEntry',
            "Created receiving entry #{$entry->id}",
            $request
        );

        return response()->json(['data' => $this->formatEntry($entry)], 201);
    }

    public function show(Request $request, ReceivingEntry $receivingEntry): JsonResponse
    {
        $this->authorize('view', $receivingEntry);
        $receivingEntry->load(['createdByUser', 'lineItems.nonConsumableItem']);

        return response()->json([
            'data' => $this->formatEntry($receivingEntry),
        ]);
    }

    public function destroy(Request $request, ReceivingEntry $receivingEntry): JsonResponse
    {
        $this->authorize('delete', $receivingEntry);

        $receivingEntry->load(['lineItems.nonConsumableItem']);
        $id = $receivingEntry->id;
        $beforeData = $this->formatEntry($receivingEntry);

        DB::transaction(function () use ($receivingEntry) {
            foreach ($receivingEntry->lineItems as $line) {
                NonConsumableItem::where('id', $line->non_consumable_item_id)
                    ->decrement('store_qty', (float) $line->quantity);
            }
            $receivingEntry->lineItems()->delete();
            $receivingEntry->delete();
        });

        AuditService::log(
            $request->user(),
            'delete',
            'ReceivingEntry',
            (int) $id,
            $beforeData,
            null,
            'ReceivingEntry',
            "Deleted receiving entry #{$id}",
            $request
        );

        return response()->json(null, 204);
    }

    private function formatEntry(ReceivingEntry $e): array
    {
        $lineItems = $e->relationLoaded('lineItems')
            ? $e->lineItems->map(fn ($line) => [
                'id' => (string) $line->id,
                'nonConsumableItemId' => (string) $line->non_consumable_item_id,
                'quantity' => (float) $line->quantity,
                'unitCost' => (float) $line->unit_cost,
                'lineTotal' => (float) $line->line_total,
                'nonConsumableItem' => $line->relationLoaded('nonConsumableItem') && $line->nonConsumableItem
                    ? ['id' => (string) $line->nonConsumableItem->id, 'name' => $line->nonConsumableItem->name]
                    : null,
            ])->values()->all()
            : [];

        $totalValue = $e->relationLoaded('lineItems')
            ? (float) $e->lineItems->sum('line_total')
            : (float) $e->lineItems()->sum('line_total');

        return [
            'id' => (string) $e->id,
            'remarks' => $e->remarks,
            'createdBy' => $e->relationLoaded('createdByUser') && $e->createdByUser
                ? ['id' => (string) $e->createdByUser->id, 'name' => $e->createdByUser->name]
                : null,
            'createdAt' => $e->created_at->toISOString(),
            'lineItems' => $lineItems,
            'totalValue' => $totalValue,
        ];
    }
}
