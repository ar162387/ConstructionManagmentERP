<?php

namespace Database\Factories;

use App\Models\ConsumableItem;
use App\Models\VendorInvoice;
use App\Models\VendorInvoiceLineItem;
use Illuminate\Database\Eloquent\Factories\Factory;

class VendorInvoiceLineItemFactory extends Factory
{
    protected $model = VendorInvoiceLineItem::class;

    public function definition(): array
    {
        $qty = fake()->randomFloat(2, 1, 100);
        $cost = fake()->randomFloat(2, 1, 500);
        return [
            'vendor_invoice_id' => VendorInvoice::factory(),
            'consumable_item_id' => ConsumableItem::factory(),
            'quantity' => $qty,
            'unit_cost' => $cost,
            'line_total' => round($qty * $cost, 2),
        ];
    }
}
