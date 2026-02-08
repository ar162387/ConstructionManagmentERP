<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Routing\UrlGenerator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
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
    public function boot(UrlGenerator $url): void
    {
        if (env('APP_ENV') === 'production') {
            $url->forceScheme('https');
        }

        $slowQueryMs = (int) env('PERF_SLOW_QUERY_MS', 0);
        if ($slowQueryMs > 0) {
            DB::listen(function (QueryExecuted $query) use ($slowQueryMs) {
                if ($query->time < $slowQueryMs) {
                    return;
                }

                Log::warning('slow_query', [
                    'time_ms' => round((float) $query->time, 2),
                    'sql' => $query->sql,
                    'connection' => $query->connectionName,
                    'path' => app()->runningInConsole() ? null : '/'.request()->path(),
                    'method' => app()->runningInConsole() ? null : request()->method(),
                ]);
            });
        }

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
