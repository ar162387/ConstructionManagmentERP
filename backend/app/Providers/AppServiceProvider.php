<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::before(function (User $user, string $ability) {
            if ($user->role === 'super_admin') {
                return true;
            }
        });

        Gate::define('canEdit', function (User $user) {
            return $user->role === 'super_admin' || ($user->role === 'admin' && ($user->can_edit ?? true));
        });

        Gate::define('canDelete', function (User $user) {
            return $user->role === 'super_admin' || ($user->role === 'admin' && ($user->can_delete ?? true));
        });
    }
}
