<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class VendorInvoice extends Model
{
    use HasFactory;

    protected $fillable = [
        'vendor_id',
        'vehicle_number',
        'bilty_number',
        'invoice_date',
        'total_amount',
        'paid_amount',
        'remaining_amount',
        'invoice_number',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'invoice_date' => 'date',
            'total_amount' => 'decimal:2',
            'paid_amount' => 'decimal:2',
            'remaining_amount' => 'decimal:2',
        ];
    }

    public function vendor(): BelongsTo
    {
        return $this->belongsTo(Vendor::class, 'vendor_id');
    }

    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function lineItems(): HasMany
    {
        return $this->hasMany(VendorInvoiceLineItem::class, 'vendor_invoice_id');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(VendorInvoicePayment::class, 'vendor_invoice_id');
    }
}
