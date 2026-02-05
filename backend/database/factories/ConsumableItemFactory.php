<?php

namespace Database\Factories;

use App\Models\ConsumableItem;
use App\Models\Unit;
use Illuminate\Database\Eloquent\Factories\Factory;

class ConsumableItemFactory extends Factory
{
    protected $model = ConsumableItem::class;

    public function definition(): array
    {
        return [
            'name' => fake()->unique()->word() . ' Material',
            'unit_id' => Unit::factory(),
            'current_stock' => fake()->randomFloat(2, 0, 1000),
        ];
    }
}
