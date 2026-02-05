<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AuditService
{
    /**
     * Compute diff of changed fields only (old vs new).
     *
     * @return array{0: array, 1: array} [beforeData (changed only), afterData (changed only)]
     */
    public static function diffChangedOnly(array $before, array $after): array
    {
        $beforeChanged = [];
        $afterChanged = [];

        $allKeys = array_unique(array_merge(array_keys($before), array_keys($after)));
        foreach ($allKeys as $key) {
            $oldVal = $before[$key] ?? null;
            $newVal = $after[$key] ?? null;
            $oldJson = json_encode($oldVal);
            $newJson = json_encode($newVal);
            if ($oldJson !== $newJson) {
                $beforeChanged[$key] = $oldVal;
                $afterChanged[$key] = $newVal;
            }
        }

        return [$beforeChanged, $afterChanged];
    }

    public static function log(
        ?User $actor,
        string $action,
        ?string $targetType = null,
        ?int $targetId = null,
        ?array $beforeData = null,
        ?array $afterData = null,
        ?string $module = null,
        ?string $details = null,
        ?Request $request = null
    ): AuditLog {
        $request = $request ?? request();

        return AuditLog::create([
            'user_id' => $actor?->id,
            'user_name' => $actor?->name,
            'user_email' => $actor?->email,
            'user_role' => $actor?->role,
            'action' => $action,
            'target_type' => $targetType,
            'target_id' => $targetId,
            'before_data' => $beforeData,
            'after_data' => $afterData,
            'module' => $module,
            'details' => $details,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'endpoint' => $request->path(),
            'method' => $request->method(),
            'status_code' => null,
            'request_id' => Str::uuid()->toString(),
        ]);
    }
}
