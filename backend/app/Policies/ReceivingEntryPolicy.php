<?php

namespace App\Policies;

use App\Models\ReceivingEntry;
use App\Models\User;

class ReceivingEntryPolicy
{
    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['super_admin', 'admin', 'site_manager']);
    }

    public function view(User $user, ReceivingEntry $receivingEntry): bool
    {
        return in_array($user->role, ['super_admin', 'admin', 'site_manager']);
    }

    public function create(User $user): bool
    {
        return in_array($user->role, ['super_admin', 'admin', 'site_manager']);
    }

    public function update(User $user, ReceivingEntry $receivingEntry): bool
    {
        if ($user->role === 'super_admin') {
            return true;
        }
        if ($user->role === 'admin') {
            return $user->can_edit ?? true;
        }
        return false;
    }

    public function delete(User $user, ReceivingEntry $receivingEntry): bool
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
