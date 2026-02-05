<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockConsumptionLineItem extends Model
{
    protected $fillable = [
        'stock_consumption_entry_id',
        'consumable_item_id',
        'quantity',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:2',
        ];
    }

    public function stockConsumptionEntry(): BelongsTo
    {
        return $this->belongsTo(StockConsumptionEntry::class, 'stock_consumption_entry_id');
    }

    public function consumableItem(): BelongsTo
    {
        return $this->belongsTo(ConsumableItem::class, 'consumable_item_id');
    }
}
