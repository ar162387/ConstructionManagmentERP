<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StockConsumptionEntry extends Model
{
    use HasFactory;

    protected $fillable = ['project_id', 'remarks', 'created_by'];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'project_id');
    }

    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function lineItems(): HasMany
    {
        return $this->hasMany(StockConsumptionLineItem::class, 'stock_consumption_entry_id');
    }
}
