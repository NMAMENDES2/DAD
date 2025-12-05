<?php

namespace App\Http\Controllers;

use App\Models\CoinTransaction;
use App\Models\User; // Importante importar o User
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class LeaderboardController extends Controller
{
    public function getLeaderboard(Request $request)
    {
        $limit = $request->input('limit', 10); // Padrão 10 para ser mais rápido

        // Cache for 5 minutes (300 seconds) para performance
        $leaderboards = Cache::remember('leaderboards', 300, function() use ($limit) {
            
            // 1. Leaderboard por Vitórias (Matches Won)
            // Assumimos que o tipo 5 é 'Game payout' (ganhou o jogo)
            // Nota: No código anterior usaste 4, mas na BD o "Game payout" era ID 5. Confirma o ID correto!
            // Vou usar 5 com base na tua imagem anterior da BD. Se for 4, muda aqui.
            $matchesWon = CoinTransaction::select('user_id')
                ->selectRaw('COUNT(DISTINCT id) as matches_won') // Contamos transações de vitória únicas
                ->where('coin_transaction_type_id', 5) // 5 = Game Payout (Vitória)
                ->groupBy('user_id')
                ->orderByDesc('matches_won')
                ->limit($limit)
                ->get()
                ->map(function($item) {
                    $user = User::find($item->user_id);
                    return [
                        'user_id' => $item->user_id,
                        'name' => $user ? $user->nickname ?? $user->name : 'Unknown', // Usa nickname se tiver
                        'matches_won' => (int) $item->matches_won,
                        'total_coins' => 0 
                    ];
                });

            // 2. Leaderboard por Total de Moedas Ganhas (Ricos)
            $coinsWon = CoinTransaction::select('user_id')
                ->selectRaw('SUM(coins) as total_coins')
                ->where('coins', '>', 0) // Apenas ganhos positivos
                ->groupBy('user_id')
                ->orderByDesc('total_coins')
                ->limit($limit)
                ->get()
                ->map(function($item) {
                    $user = User::find($item->user_id);
                    return [
                        'user_id' => $item->user_id,
                        'name' => $user ? $user->nickname ?? $user->name : 'Unknown',
                        'matches_won' => 0,
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