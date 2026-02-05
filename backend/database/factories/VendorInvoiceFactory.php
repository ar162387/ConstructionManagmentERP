<?php

namespace Database\Factories;

use App\Models\User;
use App\Models\Vendor;
use App\Models\VendorInvoice;
use Illuminate\Database\Eloquent\Factories\Factory;

class VendorInvoiceFactory extends Factory
{
    protected $model = VendorInvoice::class;

    public function definition(): array
    {
        $total = fake()->randomFloat(2, 1000, 100000);
        return [
            'vendor_id' => Vendor::factory(),
            'vehicle_number' => 'TRK-' . fake()->numerify('####'),
            'bilty_number' => 'BLT-' . fake()->numerify('#####'),
            'invoice_date' => fake()->dateTimeBetween('-6 months', 'now'),
            'invoice_number' => 'INV-' . fake()->year() . '-' . fake()->numerify('###'),
            'total_amount' => $total,
            'paid_amount' => 0,
            'remaining_amount' => $total,
            'created_by' => User::factory(),
        ];
    }
}
