<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class IsAdmin
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();

        if (!$user || $user->type !== 'A') {
            return response()->json([
                'message' => 'Forbidden. Admin access only.',
            ], 403);
        }

        return $next($request);
    }
}
