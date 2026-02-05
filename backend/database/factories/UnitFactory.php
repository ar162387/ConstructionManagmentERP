<?php

namespace Database\Factories;

use App\Models\Unit;
use Illuminate\Database\Eloquent\Factories\Factory;

class UnitFactory extends Factory
{
    protected $model = Unit::class;

    public function definition(): array
    {
        $name = fake()->unique()->word() . ' Unit';
        return [
            'name' => $name,
            'symbol' => strtoupper(substr(preg_replace('/\s+/', '', $name), 0, 3)),
        ];
    }
}
