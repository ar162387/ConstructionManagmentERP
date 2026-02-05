<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ConsumableItem;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConsumableItemController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', ConsumableItem::class);

        $items = ConsumableItem::query()
            ->with('unit')
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => $items->map(fn (ConsumableItem $c) => $this->formatConsumableItem($c)),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', ConsumableItem::class);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'unit_id' => ['required', 'exists:units,id'],
            'current_stock' => ['nullable', 'numeric', 'min:0'],
        ]);

        $validated['current_stock'] = $validated['current_stock'] ?? 0;
        $item = ConsumableItem::create($validated);
        $fresh = $item->fresh(['unit']);

        AuditService::log(
            $request->user(),
            'create',
            'ConsumableItem',
            (int) $fresh->id,
            null,
            $this->formatConsumableItem($fresh),
            'ConsumableItem',
            "Created consumable item: {$fresh->name}",
            $request
        );

        return response()->json(['data' => $this->formatConsumableItem($fresh)], 201);
    }

    public function show(Request $request, ConsumableItem $consumableItem): JsonResponse
    {
        $this->authorize('view', $consumableItem);
        $consumableItem->load('unit');

        return response()->json([
            'data' => $this->formatConsumableItem($consumableItem),
        ]);
    }

    public function update(Request $request, ConsumableItem $consumableItem): JsonResponse
    {
        $this->authorize('update', $consumableItem);

        $beforeData = $this->formatConsumableItem($consumableItem->load('unit'));

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'unit_id' => ['sometimes', 'exists:units,id'],
            'current_stock' => ['nullable', 'numeric', 'min:0'],
        ]);

        $consumableItem->update($validated);
        $fresh = $consumableItem->fresh(['unit']);

        AuditService::log(
            $request->user(),
            'update',
            'ConsumableItem',
            (int) $fresh->id,
            $beforeData,
            $this->formatConsumableItem($fresh),
            'ConsumableItem',
            "Updated consumable item: {$fresh->name}",
            $request
        );

        return response()->json(['data' => $this->formatConsumableItem($fresh)]);
    }

    public function destroy(Request $request, ConsumableItem $consumableItem): JsonResponse
    {
        $this->authorize('delete', $consumableItem);

        if ($consumableItem->vendorInvoiceLineItems()->exists()) {
            return response()->json([
                'message' => 'Cannot delete consumable item that is used in vendor invoices.',
                'errors' => ['item' => ['This item has been used in one or more vendor invoices.']],
            ], 422);
        }

        if ($consumableItem->stockConsumptionLineItems()->exists()) {
            return response()->json([
                'message' => 'Cannot delete consumable item that is used in stock consumption.',
                'errors' => ['item' => ['This item has been used in one or more stock consumption entries.']],
            ], 422);
        }

        $beforeData = $this->formatConsumableItem($consumableItem->load('unit'));
        $name = $consumableItem->name;

        $consumableItem->delete();

        AuditService::log(
            $request->user(),
            'delete',
            'ConsumableItem',
            (int) $consumableItem->id,
            $beforeData,
            null,
            'ConsumableItem',
            "Deleted consumable item: {$name}",
            $request
        );

        return response()->json(null, 204);
    }

    private function formatConsumableItem(ConsumableItem $c): array
    {
        return [
            'id' => (string) $c->id,
            'name' => $c->name,
            'unitId' => (string) $c->unit_id,
            'unit' => $c->relationLoaded('unit') ? [
                'id' => (string) $c->unit->id,
                'name' => $c->unit->name,
                'symbol' => $c->unit->symbol,
            ] : null,
            'currentStock' => (float) $c->current_stock,
            'createdAt' => $c->created_at->toISOString(),
        ];
    }
}
