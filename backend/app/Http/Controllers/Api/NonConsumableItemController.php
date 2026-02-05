<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\NonConsumableItem;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class NonConsumableItemController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', NonConsumableItem::class);

        $items = NonConsumableItem::query()
            ->with(['projectAssignments.project'])
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => $items->map(fn (NonConsumableItem $item) => $this->formatItem($item)),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', NonConsumableItem::class);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $name = trim($validated['name']);
        if (NonConsumableItem::whereRaw('LOWER(name) = ?', [Str::lower($name)])->exists()) {
            return response()->json([
                'message' => 'An item with this name already exists (names are case-insensitive).',
                'errors' => ['name' => ['An item with this name already exists.']],
            ], 422);
        }

        $item = NonConsumableItem::create([
            'name' => $name,
            'store_qty' => 0,
            'damaged_qty' => 0,
            'lost_qty' => 0,
        ]);
        $fresh = $item->fresh(['projectAssignments.project']);

        AuditService::log(
            $request->user(),
            'create',
            'NonConsumableItem',
            (int) $fresh->id,
            null,
            $this->formatItem($fresh),
            'NonConsumableItem',
            "Created non-consumable item: {$fresh->name}",
            $request
        );

        return response()->json(['data' => $this->formatItem($fresh)], 201);
    }

    public function show(Request $request, NonConsumableItem $nonConsumableItem): JsonResponse
    {
        $this->authorize('view', $nonConsumableItem);
        $nonConsumableItem->load(['projectAssignments.project']);

        return response()->json([
            'data' => $this->formatItem($nonConsumableItem),
        ]);
    }

    public function update(Request $request, NonConsumableItem $nonConsumableItem): JsonResponse
    {
        $this->authorize('update', $nonConsumableItem);

        $beforeData = $this->formatItem($nonConsumableItem->load(['projectAssignments.project']));

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
        ]);

        if (isset($validated['name'])) {
            $name = trim($validated['name']);
            $exists = NonConsumableItem::whereRaw('LOWER(name) = ?', [Str::lower($name)])
                ->where('id', '!=', $nonConsumableItem->id)
                ->exists();
            if ($exists) {
                return response()->json([
                    'message' => 'An item with this name already exists (names are case-insensitive).',
                    'errors' => ['name' => ['An item with this name already exists.']],
                ], 422);
            }
            $nonConsumableItem->name = $name;
            $nonConsumableItem->save();
        }

        $fresh = $nonConsumableItem->fresh(['projectAssignments.project']);

        AuditService::log(
            $request->user(),
            'update',
            'NonConsumableItem',
            (int) $fresh->id,
            $beforeData,
            $this->formatItem($fresh),
            'NonConsumableItem',
            "Updated non-consumable item: {$fresh->name}",
            $request
        );

        return response()->json(['data' => $this->formatItem($fresh)]);
    }

    public function destroy(Request $request, NonConsumableItem $nonConsumableItem): JsonResponse
    {
        $this->authorize('delete', $nonConsumableItem);

        if ($nonConsumableItem->receivingEntryLineItems()->exists()) {
            return response()->json([
                'message' => 'Cannot delete item that has receiving entries.',
                'errors' => ['item' => ['This item has been used in one or more receiving entries.']],
            ], 422);
        }

        if ($nonConsumableItem->movements()->exists()) {
            return response()->json([
                'message' => 'Cannot delete item that has movement history.',
                'errors' => ['item' => ['This item has movement history.']],
            ], 422);
        }

        if ($nonConsumableItem->projectAssignments()->where('quantity', '>', 0)->exists()) {
            return response()->json([
                'message' => 'Cannot delete item that has quantity assigned to projects.',
                'errors' => ['item' => ['Return all assigned quantity to store first.']],
            ], 422);
        }

        $beforeData = $this->formatItem($nonConsumableItem->load(['projectAssignments.project']));
        $name = $nonConsumableItem->name;
        $id = (int) $nonConsumableItem->id;

        $nonConsumableItem->delete();

        AuditService::log(
            $request->user(),
            'delete',
            'NonConsumableItem',
            $id,
            $beforeData,
            null,
            'NonConsumableItem',
            "Deleted non-consumable item: {$name}",
            $request
        );

        return response()->json(null, 204);
    }

    private function formatItem(NonConsumableItem $item): array
    {
        $totalAssigned = $item->relationLoaded('projectAssignments')
            ? (float) $item->projectAssignments->sum('quantity')
            : (float) $item->projectAssignments()->sum('quantity');

        return [
            'id' => (string) $item->id,
            'name' => $item->name,
            'storeQty' => (float) $item->store_qty,
            'damagedQty' => (float) $item->damaged_qty,
            'lostQty' => (float) $item->lost_qty,
            'totalAssigned' => $totalAssigned,
            'assignments' => $item->relationLoaded('projectAssignments')
                ? $item->projectAssignments->map(fn ($a) => [
                    'projectId' => (string) $a->project_id,
                    'project' => $a->relationLoaded('project') && $a->project
                        ? ['id' => (string) $a->project->id, 'name' => $a->project->name]
                        : null,
                    'quantity' => (float) $a->quantity,
                ])->values()->all()
                : [],
            'createdAt' => $item->created_at->toISOString(),
        ];
    }
}
