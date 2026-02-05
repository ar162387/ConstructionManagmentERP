<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReceivingEntryLineItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'receiving_entry_id',
        'non_consumable_item_id',
        'quantity',
        'unit_cost',
        'line_total',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:2',
            'unit_cost' => 'decimal:2',
            'line_total' => 'decimal:2',
        ];
    }

    public function receivingEntry(): BelongsTo
    {
        return $this->belongsTo(ReceivingEntry::class, 'receiving_entry_id');
    }

    public function nonConsumableItem(): BelongsTo
    {
        return $this->belongsTo(NonConsumableItem::class, 'non_consumable_item_id');
    }
}
