<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\StockConsumptionEntry;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class StockConsumptionEntryFactory extends Factory
{
    protected $model = StockConsumptionEntry::class;

    public function definition(): array
    {
        return [
            'project_id' => Project::factory(),
            'remarks' => fake()->sentence(),
            'created_by' => User::factory(),
        ];
    }
}
