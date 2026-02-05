<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProjectFactory extends Factory
{
    protected $model = Project::class;

    public function definition(): array
    {
        return [
            'name' => fake()->words(3, true),
            'description' => fake()->sentence(),
            'status' => fake()->randomElement(['active', 'completed', 'on_hold']),
            'budget' => fake()->randomFloat(2, 100000, 50000000),
            'spent' => 0,
            'start_date' => fake()->dateTimeBetween('-1 year', 'now'),
            'end_date' => fake()->dateTimeBetween('now', '+2 years'),
            'manager_id' => null,
        ];
    }
}
