<?php

namespace App\Policies;

use App\Models\NonConsumableMovement;
use App\Models\User;

class NonConsumableMovementPolicy
{
    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['super_admin', 'admin', 'site_manager']);
    }

    public function view(User $user, NonConsumableMovement $movement): bool
    {
        return in_array($user->role, ['super_admin', 'admin', 'site_manager']);
    }

    public function create(User $user): bool
    {
        return in_array($user->role, ['super_admin', 'admin', 'site_manager']);
    }

    public function update(User $user, NonConsumableMovement $movement): bool
    {
        return false;
    }

    public function delete(User $user, NonConsumableMovement $movement): bool
    {
        return false;
    }
}
