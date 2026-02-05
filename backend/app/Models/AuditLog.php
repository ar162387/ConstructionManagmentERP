<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditLog extends Model
{
    protected $fillable = [
        'user_id',
        'user_name',
        'user_email',
        'user_role',
        'action',
        'target_type',
        'target_id',
        'before_data',
        'after_data',
        'module',
        'details',
        'ip_address',
        'user_agent',
        'endpoint',
        'method',
        'status_code',
        'request_id',
    ];

    protected function casts(): array
    {
        return [
            'before_data' => 'array',
            'after_data' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
