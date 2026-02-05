<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ConsumableItem;
use App\Models\StockConsumptionEntry;
use App\Models\StockConsumptionLineItem;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StockConsumptionEntryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', StockConsumptionEntry::class);

        $query = StockConsumptionEntry::query()
            ->with(['project', 'createdByUser', 'lineItems.consumableItem.unit']);

        $user = $request->user();
        if ($user->role === 'site_manager') {
            $projectIds = $user->assignedProjects()->pluck('projects.id');
            $query->whereIn('project_id', $projectIds);
        }

        if ($request->filled('project_id')) {
            $projectId = (int) $request->input('project_id');
            if ($user->role === 'site_manager') {
                $allowed = $user->assignedProjects()->where('projects.id', $projectId)->exists();
                if (! $allowed) {
                    return response()->json(['data' => []]);
                }
            }
            $query->where('project_id', $projectId);
        }

        $entries = $query->orderByDesc('created_at')->get();

        return response()->json([
            'data' => $entries->map(fn (StockConsumptionEntry $e) => $this->formatEntry($e)),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', StockConsumptionEntry::class);

        $validated = $request->validate([
            'project_id' => ['required', 'exists:projects,id'],
            'remarks' => ['nullable', 'string', 'max:1000'],
            'line_items' => ['required', 'array', 'min:1'],
            'line_items.*.consumable_item_id' => ['required', 'exists:consumable_items,id'],
            'line_items.*.quantity' => ['required', 'numeric', 'min:0.01'],
        ]);

        $projectId = (int) $validated['project_id'];
        $user = $request->user();

        if ($user->role === 'site_manager') {
            $allowed = $user->assignedProjects()->where('projects.id', $projectId)->exists();
            if (! $allowed) {
                return response()->json(['message' => 'You do not have access to this project.'], 403);
            }
        }

        try {
            $entry = DB::transaction(function () use ($validated, $request) {
                $itemIds = array_unique(array_column($validated['line_items'], 'consumable_item_id'));
                $items = ConsumableItem::query()
                    ->whereIn('id', $itemIds)
                    ->lockForUpdate()
                    ->get()
                    ->keyBy('id');

                $requestedByItem = [];
                foreach ($validated['line_items'] as $line) {
                    $id = $line['consumable_item_id'];
                    $requestedByItem[$id] = ($requestedByItem[$id] ?? 0) + (float) $line['quantity'];
                }

                foreach ($requestedByItem as $consumableItemId => $totalRequested) {
                    $item = $items->get($consumableItemId);
                    if (! $item) {
                        throw new \InvalidArgumentException("Consumable item {$consumableItemId} not found.");
                    }
                    if ($item->current_stock < $totalRequested) {
                        throw new \InvalidArgumentException(
                            "Insufficient stock for \"{$item->name}\". Available: {$item->current_stock}, requested: {$totalRequested}."
                        );
                    }
                }

                $entry = StockConsumptionEntry::create([
                    'project_id' => $validated['project_id'],
                    'remarks' => $validated['remarks'] ?? null,
                    'created_by' => $request->user()->id,
                ]);

                foreach ($validated['line_items'] as $line) {
                    $qty = (float) $line['quantity'];
                    $itemId = $line['consumable_item_id'];
                    StockConsumptionLineItem::create([
                        'stock_consumption_entry_id' => $entry->id,
                        'consumable_item_id' => $itemId,
                        'quantity' => $qty,
                    ]);
                    ConsumableItem::where('id', $itemId)->decrement('current_stock', $qty);
                }

                return $entry->fresh(['project', 'createdByUser', 'lineItems.consumableItem.unit']);
            });
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'errors' => ['line_items' => [$e->getMessage()]],
            ], 422);
        }

        $projectName = $entry->project?->name ?? (string) $entry->project_id;

        AuditService::log(
            $request->user(),
            'create',
            'StockConsumptionEntry',
            (int) $entry->id,
            null,
            $this->formatEntry($entry),
            'StockConsumptionEntry',
            "Created stock consumption entry #{$entry->id} for project {$projectName}",
            $request
        );

        return response()->json(['data' => $this->formatEntry($entry)], 201);
    }

    public function show(Request $request, StockConsumptionEntry $stockConsumptionEntry): JsonResponse
    {
        $this->authorize('view', $stockConsumptionEntry);

        $stockConsumptionEntry->load(['project', 'createdByUser', 'lineItems.consumableItem.unit']);

        return response()->json([
            'data' => $this->formatEntry($stockConsumptionEntry),
        ]);
    }

    public function update(Request $request, StockConsumptionEntry $stockConsumptionEntry): JsonResponse
    {
        $this->authorize('update', $stockConsumptionEntry);

        $beforeData = $this->formatEntry($stockConsumptionEntry->load(['project', 'lineItems.consumableItem.unit']));

        $validated = $request->validate([
            'remarks' => ['nullable', 'string', 'max:1000'],
            'line_items' => ['sometimes', 'array', 'min:1'],
            'line_items.*.consumable_item_id' => ['required_with:line_items', 'exists:consumable_items,id'],
            'line_items.*.quantity' => ['required_with:line_items', 'numeric', 'min:0.01'],
        ]);

        try {
            $fresh = DB::transaction(function () use ($stockConsumptionEntry, $validated) {
                if (isset($validated['remarks'])) {
                    $stockConsumptionEntry->update(['remarks' => $validated['remarks']]);
                }

                if (isset($validated['line_items'])) {
                    $oldLineItems = $stockConsumptionEntry->lineItems()->with('consumableItem')->get();
                    $oldByItem = [];
                    foreach ($oldLineItems as $line) {
                        $cid = $line->consumable_item_id;
                        $oldByItem[$cid] = ($oldByItem[$cid] ?? 0) + (float) $line->quantity;
                    }

                    $newByItem = [];
                    foreach ($validated['line_items'] as $line) {
                        $cid = $line['consumable_item_id'];
                        $newByItem[$cid] = ($newByItem[$cid] ?? 0) + (float) $line['quantity'];
                    }

                    $allItemIds = array_unique(array_merge(array_keys($oldByItem), array_keys($newByItem)));
                    if (count($allItemIds) > 0) {
                        $items = ConsumableItem::whereIn('id', $allItemIds)->lockForUpdate()->get()->keyBy('id');

                        foreach ($allItemIds as $consumableItemId) {
                            $oldTotal = $oldByItem[$consumableItemId] ?? 0;
                            $newTotal = $newByItem[$consumableItemId] ?? 0;
                            $difference = $newTotal - $oldTotal;

                            if ($difference > 0) {
                                $item = $items->get($consumableItemId);
                                if ($item) {
                                    $current = (float) $item->current_stock;
                                    if ($current - $difference < 0) {
                                        throw new \InvalidArgumentException(
                                            "Cannot update consumption: insufficient stock for \"{$item->name}\". Available: {$current}, additional consumption: {$difference}."
                                        );
                                    }
                                }
                            }
                        }

                        foreach ($allItemIds as $consumableItemId) {
                            $oldTotal = $oldByItem[$consumableItemId] ?? 0;
                            $newTotal = $newByItem[$consumableItemId] ?? 0;
                            $difference = $newTotal - $oldTotal;
                            if ($difference !== 0.0) {
                                if ($difference > 0) {
                                    ConsumableItem::where('id', $consumableItemId)->decrement('current_stock', $difference);
                                } else {
                                    ConsumableItem::where('id', $consumableItemId)->increment('current_stock', abs($difference));
                                }
                            }
                        }
                    }

                    $stockConsumptionEntry->lineItems()->delete();

                    foreach ($validated['line_items'] as $line) {
                        $qty = (float) $line['quantity'];
                        StockConsumptionLineItem::create([
                            'stock_consumption_entry_id' => $stockConsumptionEntry->id,
                            'consumable_item_id' => $line['consumable_item_id'],
                            'quantity' => $qty,
                        ]);
                    }
                }

                return $stockConsumptionEntry->fresh(['project', 'createdByUser', 'lineItems.consumableItem.unit']);
            });
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'errors' => ['line_items' => [$e->getMessage()]],
            ], 422);
        }

        $afterData = $this->formatEntry($fresh);
        [$beforeChanged, $afterChanged] = AuditService::diffChangedOnly($beforeData, $afterData);
        $projectName = $fresh->project?->name ?? (string) $fresh->project_id;

        AuditService::log(
            $request->user(),
            'update',
            'StockConsumptionEntry',
            (int) $fresh->id,
            $beforeChanged,
            $afterChanged,
            'StockConsumptionEntry',
            "Updated stock consumption entry #{$fresh->id} for project {$projectName}",
            $request
        );

        return response()->json(['data' => $this->formatEntry($fresh)]);
    }

    public function destroy(Request $request, StockConsumptionEntry $stockConsumptionEntry): JsonResponse
    {
        $this->authorize('delete', $stockConsumptionEntry);

        $stockConsumptionEntry->load(['project', 'lineItems.consumableItem.unit']);
        $id = $stockConsumptionEntry->id;
        $projectName = $stockConsumptionEntry->project?->name ?? (string) $stockConsumptionEntry->project_id;
        $deleteData = $this->formatConsumptionDeleteData($stockConsumptionEntry);

        DB::transaction(function () use ($stockConsumptionEntry) {
            $lineItems = $stockConsumptionEntry->lineItems()->get();
            $itemIds = $lineItems->pluck('consumable_item_id')->unique()->filter()->values()->all();

            if (count($itemIds) > 0) {
                ConsumableItem::whereIn('id', $itemIds)->lockForUpdate()->get();

                foreach ($lineItems as $line) {
                    ConsumableItem::where('id', $line->consumable_item_id)->increment('current_stock', (float) $line->quantity);
                }
            }

            $stockConsumptionEntry->delete();
        });

        AuditService::log(
            $request->user(),
            'delete',
            'StockConsumptionEntry',
            (int) $id,
            $deleteData,
            null,
            'StockConsumptionEntry',
            "Deleted stock consumption entry #{$id} for project {$projectName}",
            $request
        );

        return response()->json(null, 204);
    }

    /** @return array{projectName: string, items: array<int, array{name: string, unit: string, quantity: float, stockBefore: float, stockAfter: float}>, remarks: string|null} */
    private function formatConsumptionDeleteData(StockConsumptionEntry $e): array
    {
        $items = [];
        foreach ($e->lineItems as $line) {
            $item = $line->consumableItem;
            $name = $item?->name ?? 'Unknown';
            $unit = $item?->unit?->symbol ?? $item?->unit?->name ?? '-';
            $qty = (float) $line->quantity;
            $stockBefore = $item ? (float) $item->current_stock : 0;
            $stockAfter = $stockBefore + $qty;
            $items[] = [
                'name' => $name,
                'unit' => $unit,
                'quantity' => $qty,
                'stockBefore' => $stockBefore,
                'stockAfter' => $stockAfter,
            ];
        }
        return [
            'projectName' => $e->project?->name ?? (string) $e->project_id,
            'items' => $items,
            'remarks' => $e->remarks,
        ];
    }

    private function formatEntry(StockConsumptionEntry $e): array
    {
        return [
            'id' => (string) $e->id,
            'projectId' => (string) $e->project_id,
            'project' => $e->relationLoaded('project') && $e->project
                ? ['id' => (string) $e->project->id, 'name' => $e->project->name]
                : null,
            'remarks' => $e->remarks,
            'createdBy' => $e->relationLoaded('createdByUser') && $e->createdByUser
                ? ['id' => (string) $e->createdByUser->id, 'name' => $e->createdByUser->name]
                : null,
            'createdAt' => $e->created_at->toISOString(),
            'lineItems' => $e->relationLoaded('lineItems')
                ? $e->lineItems->map(fn ($line) => [
                    'id' => (string) $line->id,
                    'consumableItemId' => (string) $line->consumable_item_id,
                    'quantity' => (float) $line->quantity,
                    'consumableItem' => $line->relationLoaded('consumableItem') && $line->consumableItem
                        ? [
                            'id' => (string) $line->consumableItem->id,
                            'name' => $line->consumableItem->name,
                            'unit' => $line->consumableItem->relationLoaded('unit') && $line->consumableItem->unit
                                ? ['id' => (string) $line->consumableItem->unit->id, 'name' => $line->consumableItem->unit->name, 'symbol' => $line->consumableItem->unit->symbol]
                                : null,
                        ]
                        : null,
                ])->values()->all()
                : [],
        ];
    }
}
