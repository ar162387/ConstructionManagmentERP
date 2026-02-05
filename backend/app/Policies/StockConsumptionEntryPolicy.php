<?php

namespace App\Policies;

use App\Models\User;
use App\Models\StockConsumptionEntry;

class StockConsumptionEntryPolicy
{
    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['super_admin', 'admin', 'site_manager']);
    }

    public function view(User $user, StockConsumptionEntry $entry): bool
    {
        if (in_array($user->role, ['super_admin', 'admin'])) {
            return true;
        }
        if ($user->role === 'site_manager') {
            return $user->assignedProjects()->where('projects.id', $entry->project_id)->exists();
        }
        return false;
    }

    public function create(User $user): bool
    {
        return in_array($user->role, ['super_admin', 'admin', 'site_manager']);
    }

    public function update(User $user, StockConsumptionEntry $entry): bool
    {
        if ($user->role === 'super_admin') {
            return true;
        }
        if ($user->role === 'admin') {
            return $user->can_edit ?? true;
        }
        return false;
    }

    public function delete(User $user, StockConsumptionEntry $entry): bool
    {
        if ($user->role === 'super_admin') {
            return true;
        }
        if ($user->role === 'admin') {
            return $user->can_delete ?? true;
        }
        return false;
    }
}
