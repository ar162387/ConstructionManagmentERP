<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class NonConsumableItem extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'store_qty', 'damaged_qty', 'lost_qty'];

    protected function casts(): array
    {
        return [
            'store_qty' => 'decimal:2',
            'damaged_qty' => 'decimal:2',
            'lost_qty' => 'decimal:2',
        ];
    }

    public function projectAssignments(): HasMany
    {
        return $this->hasMany(NonConsumableProjectAssignment::class, 'non_consumable_item_id');
    }

    public function receivingEntryLineItems(): HasMany
    {
        return $this->hasMany(ReceivingEntryLineItem::class, 'non_consumable_item_id');
    }

    public function movements(): HasMany
    {
        return $this->hasMany(NonConsumableMovement::class, 'non_consumable_item_id');
    }
}
