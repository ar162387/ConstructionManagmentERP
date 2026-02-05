<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Unit;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UnitController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Unit::class);

        $units = Unit::query()->orderBy('name')->get();

        return response()->json([
            'data' => $units->map(fn (Unit $u) => $this->formatUnit($u)),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Unit::class);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'symbol' => ['nullable', 'string', 'max:50'],
        ]);

        $unit = Unit::create($validated);
        $fresh = $unit->fresh();

        AuditService::log(
            $request->user(),
            'create',
            'Unit',
            (int) $fresh->id,
            null,
            $this->formatUnit($fresh),
            'Unit',
            "Created unit: {$fresh->name}",
            $request
        );

        return response()->json(['data' => $this->formatUnit($fresh)], 201);
    }

    public function show(Request $request, Unit $unit): JsonResponse
    {
        $this->authorize('view', $unit);

        return response()->json([
            'data' => $this->formatUnit($unit),
        ]);
    }

    public function update(Request $request, Unit $unit): JsonResponse
    {
        $this->authorize('update', $unit);

        $beforeData = $this->formatUnit($unit);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'symbol' => ['nullable', 'string', 'max:50'],
        ]);

        $unit->update($validated);
        $fresh = $unit->fresh();

        AuditService::log(
            $request->user(),
            'update',
            'Unit',
            (int) $fresh->id,
            $beforeData,
            $this->formatUnit($fresh),
            'Unit',
            "Updated unit: {$fresh->name}",
            $request
        );

        return response()->json(['data' => $this->formatUnit($fresh)]);
    }

    public function destroy(Request $request, Unit $unit): JsonResponse
    {
        $this->authorize('delete', $unit);

        $beforeData = $this->formatUnit($unit);
        $name = $unit->name;

        $unit->delete();

        AuditService::log(
            $request->user(),
            'delete',
            'Unit',
            (int) $unit->id,
            $beforeData,
            null,
            'Unit',
            "Deleted unit: {$name}",
            $request
        );

        return response()->json(null, 204);
    }

    private function formatUnit(Unit $u): array
    {
        return [
            'id' => (string) $u->id,
            'name' => $u->name,
            'symbol' => $u->symbol,
            'createdAt' => $u->created_at->toISOString(),
        ];
    }
}
