<?php

namespace Database\Factories;

use App\Models\ConsumableItem;
use App\Models\StockConsumptionEntry;
use App\Models\StockConsumptionLineItem;
use Illuminate\Database\Eloquent\Factories\Factory;

class StockConsumptionLineItemFactory extends Factory
{
    protected $model = StockConsumptionLineItem::class;

    public function definition(): array
    {
        return [
            'stock_consumption_entry_id' => StockConsumptionEntry::factory(),
            'consumable_item_id' => ConsumableItem::factory(),
            'quantity' => fake()->randomFloat(2, 0.5, 50),
        ];
    }
}
