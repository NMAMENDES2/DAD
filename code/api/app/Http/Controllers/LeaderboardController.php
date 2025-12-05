<?php
// app/Http/Controllers/LeaderboardController.php
namespace App\Http\Controllers;

use App\Models\CoinTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;


// TAES
class LeaderboardController extends Controller
{
    public function getLeaderboard(Request $request)
    {
        $limit = $request->input('limit', 50);

        // Cache for 5 minutes (300 seconds)
        $leaderboards = Cache::remember('leaderboards', 300, function() use ($limit) {
            
            // Leaderboard by matches won (assuming type 4 is game_payout for winners)
            $matchesWon = CoinTransaction::select('user_id')
                ->selectRaw('COUNT(DISTINCT match_id) as matches_won')
                ->where('coin_transaction_type_id', 4) // Game payout = win
                ->whereNotNull('match_id')
                ->groupBy('user_id')
                ->orderByDesc('matches_won')
                ->limit($limit)
                ->get()
                ->map(function($item) {
                    $user = \App\Models\User::find($item->user_id);
                    return [
                        'user_id' => $item->user_id,
                        'name' => $user ? $user->name : 'Unknown',
                        'matches_won' => (int) $item->matches_won,
                        'total_coins' => 0 // Add this so both lists have same structure
                    ];
                });

            // Leaderboard by total coins won
            $coinsWon = CoinTransaction::select('user_id')
                ->selectRaw('SUM(coins) as total_coins')
                ->where('coin_transaction_type_id', 5) // Game payout
                ->where('coins', '>', 0)
                ->groupBy('user_id')
                ->orderByDesc('total_coins')
                ->limit($limit)
                ->get()
                ->map(function($item) {
                    $user = \App\Models\User::find($item->user_id);
                    return [
                        'user_id' => $item->user_id,
                        'name' => $user ? $user->name : 'Unknown',
                        'matches_won' => 0, // Add this so both lists have same structure
                        'total_coins' => (int) $item->total_coins
                    ];
                });

            return [
                'matches_won' => $matchesWon,
                'coins_won' => $coinsWon
            ];
        });

        return response()->json($leaderboards);
    }
}