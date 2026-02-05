<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VendorInvoiceLineItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'vendor_invoice_id',
        'consumable_item_id',
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

    public function vendorInvoice(): BelongsTo
    {
        return $this->belongsTo(VendorInvoice::class, 'vendor_invoice_id');
    }

    public function consumableItem(): BelongsTo
    {
        return $this->belongsTo(ConsumableItem::class, 'consumable_item_id');
    }
}
