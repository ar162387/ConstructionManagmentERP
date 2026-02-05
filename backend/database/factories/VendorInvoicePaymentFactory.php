<?php

namespace Database\Factories;

use App\Models\User;
use App\Models\VendorInvoice;
use App\Models\VendorInvoicePayment;
use Illuminate\Database\Eloquent\Factories\Factory;

class VendorInvoicePaymentFactory extends Factory
{
    protected $model = VendorInvoicePayment::class;

    public function definition(): array
    {
        return [
            'vendor_invoice_id' => VendorInvoice::factory(),
            'amount' => fake()->randomFloat(2, 100, 10000),
            'date' => fake()->dateTimeBetween('-3 months', 'now'),
            'payment_mode' => fake()->randomElement(['cash', 'bank_transfer', 'cheque']),
            'reference' => fake()->optional(0.7)->regexify('CHQ-[0-9]{4}'),
            'created_by' => User::factory(),
        ];
    }
}
