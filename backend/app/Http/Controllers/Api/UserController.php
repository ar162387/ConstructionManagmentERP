<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', User::class);

        $users = User::query()->orderBy('name')->get();

        return response()->json([
            'data' => $users->map(fn (User $u) => $this->formatUser($u)),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', User::class);

        $rules = [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', Password::defaults()],
            'role' => ['required', 'in:super_admin,admin,site_manager'],
            'canEdit' => ['nullable', 'boolean'],
            'canDelete' => ['nullable', 'boolean'],
            'assignedProjects' => ['nullable', 'array'],
            'assignedProjects.*' => ['exists:projects,id'],
        ];

        // Admins can only create site managers
        if ($request->user()->role === 'admin') {
            $rules['role'] = ['required', 'in:site_manager'];
        }

        $validated = $request->validate($rules);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
            'can_edit' => $validated['canEdit'] ?? ($validated['role'] !== 'site_manager'),
            'can_delete' => $validated['canDelete'] ?? ($validated['role'] !== 'site_manager'),
        ]);

        if ($validated['role'] === 'site_manager' && ! empty($validated['assignedProjects'])) {
            $user->assignedProjects()->sync($validated['assignedProjects']);
        }

        $freshUser = $user->fresh();
        AuditService::log(
            $request->user(),
            'create',
            'User',
            (int) $freshUser->id,
            null,
            $this->formatUser($freshUser),
            'User',
            "Created user: {$freshUser->name} ({$freshUser->email})",
            $request
        );

        return response()->json(['data' => $this->formatUser($freshUser)], 201);
    }

    public function show(Request $request, User $user): JsonResponse
    {
        $this->authorize('view', $user);

        return response()->json([
            'data' => $this->formatUser($user),
        ]);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $this->authorize('update', $user);

        $beforeData = $this->formatUser($user);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'unique:users,email,' . $user->id],
            'password' => ['nullable', Password::defaults()],
            'role' => ['sometimes', 'in:super_admin,admin,site_manager'],
            'canEdit' => ['nullable', 'boolean'],
            'canDelete' => ['nullable', 'boolean'],
            'assignedProjects' => ['nullable', 'array'],
            'assignedProjects.*' => ['exists:projects,id'],
        ]);

        $user->update([
            'name' => $validated['name'] ?? $user->name,
            'email' => $validated['email'] ?? $user->email,
            'role' => $validated['role'] ?? $user->role,
            'can_edit' => array_key_exists('canEdit', $validated) ? $validated['canEdit'] : $user->can_edit,
            'can_delete' => array_key_exists('canDelete', $validated) ? $validated['canDelete'] : $user->can_delete,
        ]);

        $newPassword = $request->input('password');
        if (is_string($newPassword) && strlen(trim($newPassword)) >= 8) {
            $user->update(['password' => Hash::make(trim($newPassword))]);
        }

        if (array_key_exists('assignedProjects', $validated)) {
            $user->assignedProjects()->sync(
                $user->role === 'site_manager' ? ($validated['assignedProjects'] ?? []) : []
            );
        }

        $freshUser = $user->fresh();
        AuditService::log(
            $request->user(),
            'update',
            'User',
            (int) $freshUser->id,
            $beforeData,
            $this->formatUser($freshUser),
            'User',
            "Updated user: {$freshUser->name} ({$freshUser->email})",
            $request
        );

        return response()->json([
            'data' => $this->formatUser($freshUser),
        ]);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        $this->authorize('delete', $user);

        $beforeData = $this->formatUser($user);
        $userName = $user->name;
        $userEmail = $user->email;

        $user->delete();

        AuditService::log(
            $request->user(),
            'delete',
            'User',
            (int) $user->id,
            $beforeData,
            null,
            'User',
            "Deleted user: {$userName} ({$userEmail})",
            $request
        );

        return response()->json(null, 204);
    }

    private function formatUser(User $u): array
    {
        return [
            'id' => (string) $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'role' => $u->role,
            'avatar' => $u->avatar,
            'createdAt' => $u->created_at->toISOString(),
            'canEdit' => $u->can_edit,
            'canDelete' => $u->can_delete,
            'assignedProjects' => $u->role === 'site_manager'
                ? $u->assignedProjects()->pluck('projects.id')->map(fn ($id) => (string) $id)->values()->all()
                : [],
        ];
    }
}
