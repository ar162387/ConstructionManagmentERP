<?php

namespace App\Policies;

use App\Models\User;
use App\Models\ConsumableItem;

class ConsumableItemPolicy
{
    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['super_admin', 'admin', 'site_manager']);
    }

    public function view(User $user, ConsumableItem $consumableItem): bool
    {
        return in_array($user->role, ['super_admin', 'admin', 'site_manager']);
    }

    public function create(User $user): bool
    {
        return in_array($user->role, ['super_admin', 'admin', 'site_manager']);
    }

    public function update(User $user, ConsumableItem $consumableItem): bool
    {
        if ($user->role === 'super_admin') {
            return true;
        }
        if ($user->role === 'admin') {
            return $user->can_edit ?? true;
        }
        return false;
    }

    public function delete(User $user, ConsumableItem $consumableItem): bool
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
