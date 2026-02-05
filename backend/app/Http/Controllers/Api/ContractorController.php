<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Contractor;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ContractorController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Contractor::class);

        $request->validate([
            'project_id' => ['required', 'exists:projects,id'],
        ]);
        $projectId = (int) $request->input('project_id');
        $user = $request->user();

        if ($user->role === 'site_manager') {
            $allowed = $user->assignedProjects()->where('projects.id', $projectId)->exists();
            if (! $allowed) {
                return response()->json(['data' => []]);
            }
        }

        $contractors = Contractor::query()
            ->where('project_id', $projectId)
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => $contractors->map(fn (Contractor $c) => $this->formatContractor($c)),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Contractor::class);

        $validated = $request->validate([
            'project_id' => ['required', 'exists:projects,id'],
            'name' => ['required', 'string', 'max:255'],
            'contact_person' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
        ]);

        $projectId = (int) $validated['project_id'];
        if ($request->user()->role === 'site_manager') {
            $allowed = $request->user()->assignedProjects()->where('projects.id', $projectId)->exists();
            if (! $allowed) {
                return response()->json(['message' => 'You do not have access to this project.'], 403);
            }
        }

        $contractor = Contractor::create($validated);
        $fresh = $contractor->fresh();

        AuditService::log(
            $request->user(),
            'create',
            'Contractor',
            (int) $fresh->id,
            null,
            $this->formatContractor($fresh),
            'Contractor',
            "Created contractor: {$fresh->name}",
            $request
        );

        return response()->json(['data' => $this->formatContractor($fresh)], 201);
    }

    public function show(Request $request, Contractor $contractor): JsonResponse
    {
        $this->authorize('view', $contractor);

        return response()->json([
            'data' => $this->formatContractor($contractor),
        ]);
    }

    public function update(Request $request, Contractor $contractor): JsonResponse
    {
        $this->authorize('update', $contractor);

        $beforeData = $this->formatContractor($contractor);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'contact_person' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
        ]);

        $contractor->update($validated);
        $fresh = $contractor->fresh();

        AuditService::log(
            $request->user(),
            'update',
            'Contractor',
            (int) $fresh->id,
            $beforeData,
            $this->formatContractor($fresh),
            'Contractor',
            "Updated contractor: {$fresh->name}",
            $request
        );

        return response()->json(['data' => $this->formatContractor($fresh)]);
    }

    public function destroy(Request $request, Contractor $contractor): JsonResponse
    {
        $this->authorize('delete', $contractor);

        if ($contractor->billingEntries()->exists() || $contractor->payments()->exists()) {
            return response()->json([
                'message' => 'Cannot delete contractor that has billing entries or payments.',
                'errors' => ['contractor' => ['This contractor has billing or payment records. Delete them first.']],
            ], 422);
        }

        $beforeData = $this->formatContractor($contractor);
        $name = $contractor->name;

        $contractor->delete();

        AuditService::log(
            $request->user(),
            'delete',
            'Contractor',
            (int) $contractor->id,
            $beforeData,
            null,
            'Contractor',
            "Deleted contractor: {$name}",
            $request
        );

        return response()->json(null, 204);
    }

    private function formatContractor(Contractor $c): array
    {
        return [
            'id' => (string) $c->id,
            'projectId' => (string) $c->project_id,
            'name' => $c->name,
            'contactPerson' => $c->contact_person,
            'phone' => $c->phone,
            'email' => $c->email,
            'createdAt' => $c->created_at->toISOString(),
        ];
    }
}
