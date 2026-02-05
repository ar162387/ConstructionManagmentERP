<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ConsumableItem extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'unit_id', 'current_stock'];

    protected function casts(): array
    {
        return [
            'current_stock' => 'decimal:2',
        ];
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class, 'unit_id');
    }

    public function vendorInvoiceLineItems(): HasMany
    {
        return $this->hasMany(VendorInvoiceLineItem::class, 'consumable_item_id');
    }

    public function stockConsumptionLineItems(): HasMany
    {
        return $this->hasMany(StockConsumptionLineItem::class, 'consumable_item_id');
    }
}
