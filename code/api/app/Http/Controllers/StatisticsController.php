<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Game;
use App\Models\User;
use App\Models\GameMatch;
use App\Models\CoinPurchase;

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
            'total_games' => $totalGames,
            'total_wins' => $totalWins,
            'best_score' => $bestScore,
            'total_coins' => $user->coins_balance,
        ]);
    }

    public function getGlobalStats()
{
    return response()->json([
        'total_players' => User::where('type', 'P')->count(),
        'total_admins'  => User::where('type', 'A')->count(),
        'total_games'   => Game::count(),
        'total_matches' => GameMatch::count(),
        'bisca3_games'  => Game::where('type', '3')->count(),
        'bisca9_games'  => Game::where('type', '9')->count(),
        'total_purchases' => CoinPurchase::count(),
        'total_purchases_euros' => CoinPurchase::sum('euros'),
    ]);
}
}