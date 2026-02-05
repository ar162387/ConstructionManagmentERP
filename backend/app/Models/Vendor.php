<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Vendor extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'contact_person', 'phone', 'email'];

    public function vendorInvoices(): HasMany
    {
        return $this->hasMany(VendorInvoice::class, 'vendor_id');
    }
}
