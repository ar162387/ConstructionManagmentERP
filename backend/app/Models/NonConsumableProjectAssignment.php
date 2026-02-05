<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NonConsumableProjectAssignment extends Model
{
    use HasFactory;

    protected $fillable = ['non_consumable_item_id', 'project_id', 'quantity'];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:2',
        ];
    }

    public function nonConsumableItem(): BelongsTo
    {
        return $this->belongsTo(NonConsumableItem::class, 'non_consumable_item_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'project_id');
    }
}
