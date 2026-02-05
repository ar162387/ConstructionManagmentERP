<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\StockConsumptionEntry;
use App\Services\AuditService;
use App\Services\ProjectUtilizationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProjectController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Project::class);

        $query = Project::query()->with(['manager:id,name,email', 'siteManagers:id,name,email']);

        if ($request->user()->role === 'site_manager') {
            $projectIds = $request->user()->assignedProjects()->pluck('projects.id');
            $query->whereIn('id', $projectIds);
        }

        $projects = $query->orderBy('name')->get();

        return response()->json([
            'data' => $projects->map(fn (Project $p) => $this->formatProject($p)),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Project::class);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'budget' => ['required', 'numeric', 'min:0'],
            'description' => ['nullable', 'string'],
            'status' => ['nullable', 'in:active,completed,on_hold'],
            'startDate' => ['nullable', 'date'],
            'endDate' => ['nullable', 'date'],
            'managerId' => ['nullable', 'exists:users,id'],
        ]);

        $project = Project::create([
            'name' => $validated['name'],
            'budget' => $validated['budget'],
            'description' => $validated['description'] ?? null,
            'status' => $validated['status'] ?? 'active',
            'start_date' => $validated['startDate'] ?? now(),
            'end_date' => $validated['endDate'] ?? null,
            'manager_id' => $validated['managerId'] ?? null,
            'spent' => 0,
        ]);

        $project->load(['manager:id,name,email', 'siteManagers:id,name,email']);
        AuditService::log(
            $request->user(),
            'create',
            'Project',
            (int) $project->id,
            null,
            $this->formatProject($project),
            'Project',
            "Created project: {$project->name}",
            $request
        );

        return response()->json(['data' => $this->formatProject($project)], 201);
    }

    public function show(Request $request, Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        return response()->json([
            'data' => $this->formatProject($project->load(['manager:id,name,email', 'siteManagers:id,name,email'])),
        ]);
    }

    public function update(Request $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'budget' => ['sometimes', 'numeric', 'min:0'],
            'description' => ['nullable', 'string'],
            'status' => ['sometimes', 'in:active,completed,on_hold'],
            'startDate' => ['sometimes', 'date'],
            'endDate' => ['nullable', 'date'],
            'managerId' => ['nullable', 'exists:users,id'],
        ]);

        $beforeData = $this->formatProject($project->load(['manager:id,name,email', 'siteManagers:id,name,email']));

        $project->update([
            'name' => $validated['name'] ?? $project->name,
            'budget' => $validated['budget'] ?? $project->budget,
            'description' => array_key_exists('description', $validated) ? $validated['description'] : $project->description,
            'status' => $validated['status'] ?? $project->status,
            'start_date' => isset($validated['startDate']) ? $validated['startDate'] : $project->start_date,
            'end_date' => array_key_exists('endDate', $validated) ? $validated['endDate'] : $project->end_date,
            'manager_id' => array_key_exists('managerId', $validated) ? $validated['managerId'] : $project->manager_id,
        ]);

        $freshProject = $project->fresh()->load(['manager:id,name,email', 'siteManagers:id,name,email']);
        AuditService::log(
            $request->user(),
            'update',
            'Project',
            (int) $freshProject->id,
            $beforeData,
            $this->formatProject($freshProject),
            'Project',
            "Updated project: {$freshProject->name}",
            $request
        );

        return response()->json([
            'data' => $this->formatProject($freshProject),
        ]);
    }

    public function destroy(Request $request, Project $project): JsonResponse
    {
        $this->authorize('delete', $project);

        $refs = [];
        if (StockConsumptionEntry::where('project_id', $project->id)->exists()) {
            $refs[] = 'stock consumption entries';
        }
        if ($project->siteManagers()->exists()) {
            $refs[] = 'assigned site managers';
        }
        if (! empty($refs)) {
            return response()->json([
                'message' => 'Cannot delete project that has related data.',
                'errors' => [
                    'project' => [
                        'This project has '.implode(' and ', $refs).'. Remove or reassign them before deleting.',
                    ],
                ],
            ], 422);
        }

        $beforeData = $this->formatProject($project->load(['manager:id,name,email', 'siteManagers:id,name,email']));
        $projectName = $project->name;

        $project->delete();

        AuditService::log(
            $request->user(),
            'delete',
            'Project',
            (int) $project->id,
            $beforeData,
            null,
            'Project',
            "Deleted project: {$projectName}",
            $request
        );

        return response()->json(null, 204);
    }

    private function formatProject(Project $p): array
    {
        $utilized = ProjectUtilizationService::getUtilizedBudget($p);

        $siteManagers = $p->relationLoaded('siteManagers')
            ? $p->siteManagers->map(fn ($u) => [
                'id' => (string) $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'role' => 'Site Manager',
            ])->all()
            : [];

        return [
            'id' => (string) $p->id,
            'name' => $p->name,
            'description' => $p->description,
            'status' => $p->status,
            'budget' => (float) $p->budget,
            'spent' => $utilized,
            'startDate' => $p->start_date?->format('Y-m-d'),
            'endDate' => $p->end_date?->format('Y-m-d'),
            'managerId' => $p->manager_id ? (string) $p->manager_id : null,
            'manager' => $p->manager ? [
                'id' => (string) $p->manager->id,
                'name' => $p->manager->name,
                'email' => $p->manager->email,
            ] : null,
            'siteManagers' => $siteManagers,
        ];
    }
}
