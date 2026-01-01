<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Game;
use App\Models\User;
use App\Models\CoinPurchase;
use Illuminate\Support\Facades\DB;
use App\Models\CoinTransaction;

class StatisticsController extends Controller
{
    public function getMyStats(Request $request)
    {
        $user = $request->user();
        $id = $user->id;

        $totalGames = Game::where('player1_user_id', $id)
            ->orWhere('player2_user_id', $id)
            ->count();

        $totalWins = Game::where('winner_user_id', $id)->count();

        $bestScoreP1 = Game::where('player1_user_id', $id)->max('player1_points');
        $bestScoreP2 = Game::where('player2_user_id', $id)->max('player2_points');
        $bestScore = max($bestScoreP1, $bestScoreP2);

        return response()->json([
            'total_games'  => $totalGames,
            'total_wins'   => $totalWins,
            'best_score'   => $bestScore,
            'total_coins'  => $user->coins_balance,
        ]);
    }

    public function getGlobalStats(Request $request)
    {
        $isAdminRoute = $request->is('api/admin/*');
        $isAdminUser  = $request->user()?->type === 'A';

        $base = [
            'total_players'          => User::where('type', 'P')->count(),
            'total_admins'           => User::where('type', 'A')->count(),
            'total_games'            => Game::count(),
            'total_matches'          => DB::table('matches')->count(),
            'bisca3_games'           => Game::where('type', '3')->count(),
            'bisca9_games'           => Game::where('type', '9')->count(),
            'total_purchases'        => CoinPurchase::count(),
            'total_purchases_euros'  => CoinPurchase::sum('euros'),
        ];

        // utilizadores normais
        if (!$isAdminRoute && !$isAdminUser) {
            return response()->json($base);
        }

        // administradores
        $purchasesByPlayer = CoinTransaction::selectRaw('user_id, SUM(coins) as total_coins')
            ->whereHas('type', function ($q) {
                $q->where('name', 'Coin purchase');
            })
            ->groupBy('user_id')
            ->with('user:id,nickname,email')
            ->get();

        $gamesWonByPlayer = Game::selectRaw('winner_user_id as user_id, COUNT(*) as wins')
            ->whereNotNull('winner_user_id')
            ->groupBy('winner_user_id')
            ->with('winner:id,nickname,email')
            ->get();

        return response()->json([
            'base'                => $base,
            'per_player_purchases'=> $purchasesByPlayer,
            'per_player_wins'     => $gamesWonByPlayer,
        ]);
    }
}
