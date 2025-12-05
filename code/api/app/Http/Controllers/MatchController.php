<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MatchController extends Controller
{
    public function index(Request $request)
    {
        $userId = $request->user()->id;

        $matches = DB::table('matches')
            ->where('player1_user_id', $userId)
            ->orWhere('player2_user_id', $userId)
            ->orderBy('began_at', 'desc')
            ->paginate(15);

        return response()->json($matches);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'type' => 'required|string',
            'status' => 'required|string',
            'player1_marks' => 'required|integer',
            'player2_marks' => 'required|integer',
            'winner_user_id' => 'nullable|integer',
        ]);

        $user = $request->user();
        
        // --- SOLUÇÃO: DEFINIR UM ID PARA O BOT ---
        // Vamos usar o ID 1 (Admin) para representar o Bot. 
        // Se quiseres criar um user "Bot" na BD, troca este número pelo ID dele.
        $botId = 520; 
        
        // Se estiveres a jogar com a conta ID 1, usa o ID 2 para o bot para não dar conflito
        if ($user->id == 1) {
            $botId = 2; 
        }

        // Determinar Vencedor e Perdedor
        $winnerIdInput = $request->input('winner_user_id');
        
        $finalWinnerId = null;
        $finalLoserId = null;

        if ($winnerIdInput == $user->id) {
            // Humano Ganhou
            $finalWinnerId = $user->id;
            $finalLoserId = $botId;
        } else {
            // Bot Ganhou (Android enviou null ou outro ID)
            $finalWinnerId = $botId;
            $finalLoserId = $user->id;
        }

        // Inserir na tabela 'matches'
        $matchId = DB::table('matches')->insertGetId([
            'type' => $validated['type'],
            'status' => $validated['status'],
            'player1_user_id' => $user->id,
            'player2_user_id' => $botId, // <--- AQUI ESTAVA O ERRO (agora tem ID)
            'winner_user_id' => $finalWinnerId,
            'loser_user_id' => $finalLoserId,
            'player1_marks' => $validated['player1_marks'],
            'player2_marks' => $validated['player2_marks'],
            'player1_points' => 0, 
            'player2_points' => 0,
            'began_at' => now(),
            'ended_at' => now(),
            'total_time' => 0
        ]);

        return response()->json(['id' => $matchId, 'message' => 'Match created'], 201);
    }
}