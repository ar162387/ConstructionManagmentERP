<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class RequestTimingMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! config('app.debug_performance')) {
            return $next($request);
        }

        $start = hrtime(true);

        DB::flushQueryLog();
        DB::enableQueryLog();

        /** @var Response $response */
        $response = $next($request);

        $totalMs = (hrtime(true) - $start) / 1_000_000;
        $queryLog = DB::getQueryLog();
        DB::disableQueryLog();

        $sqlMs = 0.0;
        foreach ($queryLog as $query) {
            $sqlMs += (float) ($query['time'] ?? 0);
        }

        $queryCount = count($queryLog);
        $appMs = max(0.0, $totalMs - $sqlMs);

        $response->headers->set('X-Debug-Total-Ms', number_format($totalMs, 2, '.', ''));
        $response->headers->set('X-Debug-SQL-Ms', number_format($sqlMs, 2, '.', ''));
        $response->headers->set('X-Debug-App-Ms', number_format($appMs, 2, '.', ''));
        $response->headers->set('X-Debug-SQL-Count', (string) $queryCount);

        Log::info('request_timing', [
            'method' => $request->method(),
            'path' => '/'.$request->path(),
            'status' => $response->getStatusCode(),
            'total_ms' => round($totalMs, 2),
            'sql_ms' => round($sqlMs, 2),
            'app_ms' => round($appMs, 2),
            'sql_count' => $queryCount,
        ]);

        return $response;
    }
}
