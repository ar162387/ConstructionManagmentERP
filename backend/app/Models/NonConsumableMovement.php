<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NonConsumableMovement extends Model
{
    use HasFactory;

    public const TYPE_ASSIGN_TO_PROJECT = 'assign_to_project';
    public const TYPE_RETURN_TO_STORE = 'return_to_store';
    public const TYPE_MARK_LOST = 'mark_lost';
    public const TYPE_MARK_DAMAGED = 'mark_damaged';
    public const TYPE_REPAIR_DAMAGED = 'repair_damaged';
    public const TYPE_MARK_LOST_FROM_DAMAGED = 'mark_lost_from_damaged';

    /** Undo/reverse movement types (for rollback) */
    public const TYPE_RESTORE_FROM_LOST = 'restore_from_lost';
    public const TYPE_RESTORE_FROM_DAMAGED = 'restore_from_damaged';
    public const TYPE_REVERSE_REPAIR = 'reverse_repair';
    public const TYPE_RESTORE_TO_DAMAGED = 'restore_to_damaged';

    protected $fillable = [
        'non_consumable_item_id',
        'movement_type',
        'quantity',
        'project_id',
        'cost',
        'remarks',
        'created_by',
        'idempotency_key',
        'undone_at',
        'undone_by',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:2',
            'cost' => 'decimal:2',
            'undone_at' => 'datetime',
        ];
    }

    public function undoneByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'undone_by');
    }

    public function nonConsumableItem(): BelongsTo
    {
        return $this->belongsTo(NonConsumableItem::class, 'non_consumable_item_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'project_id');
    }

    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
