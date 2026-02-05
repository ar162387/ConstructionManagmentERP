<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', AuditLog::class);

        $query = AuditLog::query()->orderBy('created_at', 'desc');

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->filled('action')) {
            $query->where('action', $request->action);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        if ($request->filled('target_type')) {
            $query->where('target_type', $request->target_type);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('user_name', 'like', "%{$search}%")
                    ->orWhere('user_email', 'like', "%{$search}%")
                    ->orWhere('details', 'like', "%{$search}%")
                    ->orWhere('module', 'like', "%{$search}%")
                    ->orWhere('target_type', 'like', "%{$search}%");
            });
        }

        $perPage = min((int) $request->get('per_page', 15), 100);
        $paginated = $query->paginate($perPage);

        $logs = $paginated->getCollection()->map(fn (AuditLog $log) => [
            'id' => (string) $log->id,
            'userId' => $log->user_id ? (string) $log->user_id : null,
            'userName' => $log->user_name,
            'action' => $log->action,
            'targetType' => $log->target_type,
            'targetId' => $log->target_id,
            'module' => $log->module,
            'details' => $log->details,
            'beforeData' => $log->before_data,
            'afterData' => $log->after_data,
            'timestamp' => $log->created_at->toISOString(),
            'ipAddress' => $log->ip_address,
        ]);

        return response()->json([
            'data' => $logs,
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ]);
    }

    public function stats(Request $request): JsonResponse
    {
        $this->authorize('viewAny', AuditLog::class);

        $query = AuditLog::query();

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $total = $query->count();
        $createCount = (clone $query)->where('action', 'create')->count();
        $updateCount = (clone $query)->where('action', 'update')->count();
        $deleteCount = (clone $query)->where('action', 'delete')->count();
        $loginCount = (clone $query)->where('action', 'login')->count();
        $logoutCount = (clone $query)->where('action', 'logout')->count();

        return response()->json([
            'total' => $total,
            'create' => $createCount,
            'update' => $updateCount,
            'delete' => $deleteCount,
            'login' => $loginCount,
            'logout' => $logoutCount,
        ]);
    }

    public function filterOptions(Request $request): JsonResponse
    {
        $this->authorize('viewAny', AuditLog::class);

        $users = AuditLog::query()
            ->whereNotNull('user_id')
            ->select('user_id', 'user_name', 'user_email')
            ->orderBy('created_at', 'desc')
            ->get()
            ->unique('user_id')
            ->values()
            ->map(fn ($row) => [
                'id' => (string) $row->user_id,
                'name' => $row->user_name ?? 'Unknown',
                'email' => $row->user_email ?? '',
            ])
            ->sortBy('name')
            ->values()
            ->all();

        $targetTypes = AuditLog::query()
            ->whereNotNull('target_type')
            ->where('target_type', '!=', '')
            ->distinct()
            ->pluck('target_type')
            ->push('Auth', 'User')
            ->unique()
            ->sort()
            ->values()
            ->all();

        return response()->json([
            'users' => $users,
            'targetTypes' => $targetTypes,
        ]);
    }
}
