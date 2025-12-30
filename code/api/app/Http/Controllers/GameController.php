<?php

namespace App\Http\Controllers;

use App\Models\Game;
use Illuminate\Http\Request;

class GameController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Game::query()->with(['winner']);

        if ($request->has('type') && in_array($request->type, ['3', '9'])) {
            $query->where('type', $request->type);
        }

        if ($request->has('status') && in_array($request->status, ['Pending', 'Playing', 'Ended', 'Interrupted'])) {
            $query->where('status', $request->status);
        }

        // Sorting
        $sortField = $request->input('sort_by', 'began_at');
        $sortDirection = $request->input('sort_direction', 'desc');

        $allowedSortFields = [
            'began_at',
            'ended_at',
            'total_time',
            'type',
            'status'
        ];

        if (in_array($sortField, $allowedSortFields)) {
            $query->orderBy($sortField, $sortDirection === 'asc' ? 'asc' : 'desc');
        }

        // Pagination
        $perPage = $request->input('per_page', 15);
        $games = $query->paginate($perPage);

        return response()->json([
            'data' => $games->items(),
            'meta' => [
                'current_page' => $games->currentPage(),
                'last_page' => $games->lastPage(),
                'per_page' => $games->perPage(),
                'total' => $games->total()
            ]
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        // 1. Validar dados (winner_user_id pode ser null se o bot ganhar)
        $validated = $request->validate([
            'type' => 'required|string',
            'status' => 'required|string',
            'player1_points' => 'required|integer',
            'player2_points' => 'required|integer',
            'winner_user_id' => 'nullable|integer|exists:users,id',
        ]);

        $currentUser = $request->user();

        $game = new Game();
        $game->type = $validated['type'];
        $game->status = $validated['status'];
        
        // Player 1 é sempre o humano autenticado
        $game->player1_user_id = $currentUser->id;
        $game->player2_user_id = null; // Bot

        // Definir Vencedor e Perdedor
        $game->winner_user_id = $validated['winner_user_id'];

        if ($validated['winner_user_id'] == $currentUser->id) {
            // Se o humano ganhou, o perdedor é o bot (null)
            $game->loser_user_id = null;
        } else {
            // Se o humano não ganhou (bot ganhou), o humano é o perdedor
            $game->loser_user_id = $currentUser->id;
        }
        
        $game->player1_points = $validated['player1_points'];
        $game->player2_points = $validated['player2_points'];
        
        $game->began_at = now();
        $game->ended_at = now();
        $game->total_time = 0; 
        
        $game->save();

        return response()->json($game, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Game $game)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Game $game)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Game $game)
    {
        //
    }
    public function myGames(Request $request)
{
    $userId = $request->user()->id;

    $games = Game::where('player1_user_id', $userId)
        ->orWhere('player2_user_id', $userId)
        ->orderBy('began_at', 'desc')
        ->paginate(15);

    return response()->json($games);
}
}
