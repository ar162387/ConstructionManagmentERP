<?php

namespace App\Policies;

use App\Models\ContractorPayment;
use App\Models\User;

class ContractorPaymentPolicy
{
    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['super_admin', 'admin', 'site_manager']);
    }

    public function view(User $user, ContractorPayment $payment): bool
    {
        if (in_array($user->role, ['super_admin', 'admin'])) {
            return true;
        }
        if ($user->role === 'site_manager') {
            return $user->assignedProjects()->where('projects.id', $payment->contractor->project_id)->exists();
        }
        return false;
    }

    public function create(User $user): bool
    {
        return in_array($user->role, ['super_admin', 'admin', 'site_manager']);
    }

    public function update(User $user, ContractorPayment $payment): bool
    {
        if ($user->role === 'super_admin') {
            return true;
        }
        if ($user->role === 'admin') {
            return $user->can_edit ?? true;
        }
        return false;
    }

    public function delete(User $user, ContractorPayment $payment): bool
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
