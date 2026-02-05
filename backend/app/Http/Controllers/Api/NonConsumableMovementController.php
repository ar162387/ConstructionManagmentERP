<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\NonConsumableItem;
use App\Models\NonConsumableMovement;
use App\Models\NonConsumableProjectAssignment;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NonConsumableMovementController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', NonConsumableMovement::class);

        $query = NonConsumableMovement::query()
            ->with(['nonConsumableItem', 'project', 'createdByUser']);

        $user = $request->user();
        if ($user->role === 'site_manager') {
            $projectIds = $user->assignedProjects()->pluck('projects.id')->all();
            $query->where(function ($q) use ($projectIds) {
                $q->whereNull('project_id')->orWhereIn('project_id', $projectIds);
            });
        }

        if ($request->filled('project_id')) {
            $projectId = (int) $request->input('project_id');
            if ($user->role === 'site_manager') {
                $allowed = in_array($projectId, $user->assignedProjects()->pluck('projects.id')->all());
                if (! $allowed) {
                    return response()->json(['data' => []]);
                }
            }
            $query->where('project_id', $projectId);
        }

        if ($request->filled('non_consumable_item_id')) {
            $query->where('non_consumable_item_id', $request->input('non_consumable_item_id'));
        }

        if ($request->filled('movement_type')) {
            $query->where('movement_type', $request->input('movement_type'));
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->input('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->input('date_to'));
        }

        if ($request->filled('user_id')) {
            $query->where('created_by', $request->input('user_id'));
        }

        $movements = $query->orderByDesc('created_at')->get();

        return response()->json([
            'data' => $movements->map(fn (NonConsumableMovement $m) => $this->formatMovement($m)),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', NonConsumableMovement::class);

        $validated = $request->validate([
            'movement_type' => ['required', 'string', 'in:assign_to_project,return_to_store,mark_lost,mark_damaged,repair_damaged,mark_lost_from_damaged'],
            'non_consumable_item_id' => ['required', 'exists:non_consumable_items,id'],
            'quantity' => ['required', 'numeric', 'min:0.01'],
            'project_id' => ['nullable', 'exists:projects,id'],
            'cost' => ['nullable', 'numeric', 'min:0'],
            'remarks' => ['nullable', 'string', 'max:1000'],
            'idempotency_key' => ['nullable', 'string', 'max:255'],
        ]);

        $user = $request->user();

        if (! empty($validated['idempotency_key'])) {
            $existing = NonConsumableMovement::where('idempotency_key', $validated['idempotency_key'])->first();
            if ($existing) {
                $existing->load(['nonConsumableItem', 'project', 'createdByUser']);
                return response()->json(['data' => $this->formatMovement($existing)], 201);
            }
        }

        $type = $validated['movement_type'];
        $projectId = isset($validated['project_id']) ? (int) $validated['project_id'] : null;
        $quantity = (float) $validated['quantity'];

        if ($type === NonConsumableMovement::TYPE_ASSIGN_TO_PROJECT || $type === NonConsumableMovement::TYPE_RETURN_TO_STORE) {
            if (! $projectId) {
                return response()->json([
                    'message' => 'Project is required for this movement type.',
                    'errors' => ['project_id' => ['Project is required.']],
                ], 422);
            }
            if ($user->role === 'site_manager') {
                $allowed = $user->assignedProjects()->where('projects.id', $projectId)->exists();
                if (! $allowed) {
                    return response()->json(['message' => 'You do not have access to this project.'], 403);
                }
            }
        }

        if (in_array($type, ['mark_lost', 'mark_damaged'], true) && $projectId && $user->role === 'site_manager') {
            $allowed = $user->assignedProjects()->where('projects.id', $projectId)->exists();
            if (! $allowed) {
                return response()->json(['message' => 'You do not have access to this project.'], 403);
            }
        }

        try {
            $movement = DB::transaction(function () use ($validated, $type, $projectId, $quantity, $user) {
                $itemId = (int) $validated['non_consumable_item_id'];
                $item = NonConsumableItem::where('id', $itemId)->lockForUpdate()->first();
                if (! $item) {
                    throw new \InvalidArgumentException('Non-consumable item not found.');
                }

                switch ($type) {
                    case NonConsumableMovement::TYPE_ASSIGN_TO_PROJECT:
                        if ($item->store_qty < $quantity) {
                            throw new \InvalidArgumentException(
                                "Insufficient store quantity for \"{$item->name}\". Available: {$item->store_qty}, requested: {$quantity}."
                            );
                        }
                        $item->decrement('store_qty', $quantity);
                        $assignment = NonConsumableProjectAssignment::firstOrCreate(
                            [
                                'non_consumable_item_id' => $itemId,
                                'project_id' => $projectId,
                            ],
                            ['quantity' => 0]
                        );
                        $assignment->lockForUpdate();
                        $assignment->increment('quantity', $quantity);
                        break;

                    case NonConsumableMovement::TYPE_RETURN_TO_STORE:
                        $assignment = NonConsumableProjectAssignment::where('non_consumable_item_id', $itemId)
                            ->where('project_id', $projectId)
                            ->lockForUpdate()
                            ->first();
                        if (! $assignment || (float) $assignment->quantity < $quantity) {
                            $assigned = $assignment ? (float) $assignment->quantity : 0;
                            throw new \InvalidArgumentException(
                                "Insufficient assigned quantity for \"{$item->name}\" on this project. Assigned: {$assigned}, requested: {$quantity}."
                            );
                        }
                        $assignment->decrement('quantity', $quantity);
                        $item->increment('store_qty', $quantity);
                        break;

                    case NonConsumableMovement::TYPE_MARK_LOST:
                        if ($projectId) {
                            $assignment = NonConsumableProjectAssignment::where('non_consumable_item_id', $itemId)
                                ->where('project_id', $projectId)
                                ->lockForUpdate()
                                ->first();
                            $available = $assignment ? (float) $assignment->quantity : 0;
                            if ($available < $quantity) {
                                throw new \InvalidArgumentException(
                                    "Insufficient assigned quantity for \"{$item->name}\" on this project. Available: {$available}, requested: {$quantity}."
                                );
                            }
                            $assignment->decrement('quantity', $quantity);
                        } else {
                            $available = (float) $item->store_qty;
                            if ($available < $quantity) {
                                throw new \InvalidArgumentException(
                                    "Insufficient store quantity for \"{$item->name}\". Available: {$available}, requested: {$quantity}."
                                );
                            }
                            $item->decrement('store_qty', $quantity);
                        }
                        $item->increment('lost_qty', (float) $validated['quantity']);
                        break;

                    case NonConsumableMovement::TYPE_MARK_DAMAGED:
                        if ($projectId) {
                            $assignment = NonConsumableProjectAssignment::where('non_consumable_item_id', $itemId)
                                ->where('project_id', $projectId)
                                ->lockForUpdate()
                                ->first();
                            $available = $assignment ? (float) $assignment->quantity : 0;
                            if ($available < $quantity) {
                                throw new \InvalidArgumentException(
                                    "Insufficient assigned quantity for \"{$item->name}\" on this project. Available: {$available}, requested: {$quantity}."
                                );
                            }
                            $assignment->decrement('quantity', $quantity);
                        } else {
                            $available = (float) $item->store_qty;
                            if ($available < $quantity) {
                                throw new \InvalidArgumentException(
                                    "Insufficient store quantity for \"{$item->name}\". Available: {$available}, requested: {$quantity}."
                                );
                            }
                            $item->decrement('store_qty', $quantity);
                        }
                        $item->increment('damaged_qty', (float) $validated['quantity']);
                        break;

                    case NonConsumableMovement::TYPE_MARK_LOST_FROM_DAMAGED:
                        if ($item->damaged_qty < $quantity) {
                            throw new \InvalidArgumentException(
                                "Insufficient damaged quantity for \"{$item->name}\". Damaged: {$item->damaged_qty}, requested: {$quantity}."
                            );
                        }
                        $item->decrement('damaged_qty', $quantity);
                        $item->increment('lost_qty', (float) $validated['quantity']);
                        break;

                    case NonConsumableMovement::TYPE_REPAIR_DAMAGED:
                        if ($item->damaged_qty < $quantity) {
                            throw new \InvalidArgumentException(
                                "Insufficient damaged quantity for \"{$item->name}\". Damaged: {$item->damaged_qty}, requested: {$quantity}."
                            );
                        }
                        $item->decrement('damaged_qty', $quantity);
                        if ($projectId) {
                            $assignment = NonConsumableProjectAssignment::firstOrCreate(
                                [
                                    'non_consumable_item_id' => $itemId,
                                    'project_id' => $projectId,
                                ],
                                ['quantity' => 0]
                            );
                            $assignment->lockForUpdate();
                            $assignment->increment('quantity', $quantity);
                        } else {
                            $item->increment('store_qty', $quantity);
                        }
                        break;
                }

                return NonConsumableMovement::create([
                    'non_consumable_item_id' => $itemId,
                    'movement_type' => $type,
                    'quantity' => (float) $validated['quantity'],
                    'project_id' => $projectId,
                    'cost' => isset($validated['cost']) ? (float) $validated['cost'] : null,
                    'remarks' => $validated['remarks'] ?? null,
                    'created_by' => $user->id,
                    'idempotency_key' => $validated['idempotency_key'] ?? null,
                ]);
            });
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'errors' => ['quantity' => [$e->getMessage()]],
            ], 422);
        }

        $movement->load(['nonConsumableItem', 'project', 'createdByUser']);

        AuditService::log(
            $request->user(),
            'create',
            'NonConsumableMovement',
            (int) $movement->id,
            null,
            $this->formatMovement($movement),
            'NonConsumableMovement',
            "Created movement {$movement->movement_type} for item #{$movement->non_consumable_item_id}",
            $request
        );

        return response()->json(['data' => $this->formatMovement($movement)], 201);
    }

    public function show(Request $request, NonConsumableMovement $nonConsumableMovement): JsonResponse
    {
        $this->authorize('view', $nonConsumableMovement);
        $nonConsumableMovement->load(['nonConsumableItem', 'project', 'createdByUser']);

        return response()->json([
            'data' => $this->formatMovement($nonConsumableMovement),
        ]);
    }

    private function formatMovement(NonConsumableMovement $m): array
    {
        return [
            'id' => (string) $m->id,
            'nonConsumableItemId' => (string) $m->non_consumable_item_id,
            'movementType' => $m->movement_type,
            'quantity' => (float) $m->quantity,
            'projectId' => $m->project_id ? (string) $m->project_id : null,
            'cost' => $m->cost !== null ? (float) $m->cost : null,
            'remarks' => $m->remarks,
            'createdBy' => $m->relationLoaded('createdByUser') && $m->createdByUser
                ? ['id' => (string) $m->createdByUser->id, 'name' => $m->createdByUser->name]
                : null,
            'createdAt' => $m->created_at->toISOString(),
            'nonConsumableItem' => $m->relationLoaded('nonConsumableItem') && $m->nonConsumableItem
                ? ['id' => (string) $m->nonConsumableItem->id, 'name' => $m->nonConsumableItem->name]
                : null,
            'project' => $m->relationLoaded('project') && $m->project
                ? ['id' => (string) $m->project->id, 'name' => $m->project->name]
                : null,
        ];
    }
}
