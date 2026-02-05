<?php

namespace Database\Seeders;

use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $users = [
            ['email' => 'super@projectflow.com', 'name' => 'Sarah Johnson', 'role' => 'super_admin', 'seed' => 'Sarah'],
            ['email' => 'admin@projectflow.com', 'name' => 'Michael Chen', 'role' => 'admin', 'seed' => 'Michael'],
            ['email' => 'manager@projectflow.com', 'name' => 'David Williams', 'role' => 'site_manager', 'seed' => 'David'],
        ];

        $created = [];
        foreach ($users as $u) {
            $created[$u['role']] = User::updateOrCreate(
                ['email' => $u['email']],
                [
                    'name' => $u['name'],
                    'password' => Hash::make('demo123'),
                    'role' => $u['role'],
                    'can_edit' => in_array($u['role'], ['super_admin', 'admin']),
                    'can_delete' => in_array($u['role'], ['super_admin', 'admin']),
                    'avatar' => 'https://api.dicebear.com/7.x/avataaars/svg?seed=' . $u['seed'],
                ]
            );
        }

        $project = Project::updateOrCreate(
            ['name' => 'Skyline Tower Construction'],
            [
                'description' => 'High-rise commercial building project in downtown',
                'status' => 'active',
                'budget' => 15000000,
                'spent' => 8750000,
                'start_date' => '2024-01-15',
                'end_date' => '2025-06-30',
                'manager_id' => $created['site_manager']->id ?? null,
            ]
        );

        if (isset($created['site_manager'])) {
            $created['site_manager']->assignedProjects()->syncWithoutDetaching([$project->id]);
        }

        $this->call(VendorInventorySeeder::class);
    }
}
