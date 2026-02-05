<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VendorInvoicePayment extends Model
{
    protected $fillable = [
        'vendor_invoice_id',
        'amount',
        'date',
        'payment_mode',
        'reference',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'date' => 'date',
        ];
    }

    public function vendorInvoice(): BelongsTo
    {
        return $this->belongsTo(VendorInvoice::class, 'vendor_invoice_id');
    }

    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
