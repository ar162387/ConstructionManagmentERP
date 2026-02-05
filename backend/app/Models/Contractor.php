<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Contractor extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'name',
        'contact_person',
        'phone',
        'email',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'project_id');
    }

    public function billingEntries(): HasMany
    {
        return $this->hasMany(ContractorBillingEntry::class, 'contractor_id');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(ContractorPayment::class, 'contractor_id');
    }
}
