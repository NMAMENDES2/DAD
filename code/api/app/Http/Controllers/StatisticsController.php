<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Game;
use App\Models\User;

class StatisticsController extends Controller
{
    public function getMyStats(Request $request)
    {
        $user = $request->user();
        $id = $user->id;

        // Total Jogos
        $totalGames = Game::where('player1_user_id', $id)
            ->orWhere('player2_user_id', $id)
            ->count();

        // Total Vitórias
        $totalWins = Game::where('winner_user_id', $id)->count();

        // Melhor Pontuação (Num jogo onde fui Player 1 ou Player 2)
        $bestScoreP1 = Game::where('player1_user_id', $id)->max('player1_points');
        $bestScoreP2 = Game::where('player2_user_id', $id)->max('player2_points');
        $bestScore = max($bestScoreP1, $bestScoreP2);

        return response()->json([
            'total_games' => $totalGames,
            'total_wins' => $totalWins,
            'best_score' => $bestScore,
            'total_coins' => $user->coins_balance
        ]);
    }
}