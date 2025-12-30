<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\GameMatch;

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
            'player1_user_id' => 'required|integer|exists:users,id',
            'player2_user_id' => 'required|integer|exists:users,id',
            'player1_marks' => 'required|integer',
            'player2_marks' => 'required|integer',
            'player1_points' => 'required|integer',
            'player2_points' => 'required|integer',
            'winner_user_id' => 'nullable|integer|exists:users,id',
        ]);

        $match = GameMatch::create([
            'type' => $validated['type'],
            'status' => $validated['status'],
            'player1_user_id' => $validated['player1_user_id'],
            'player2_user_id' => $validated['player2_user_id'],
            'winner_user_id' => $validated['winner_user_id'],
            'loser_user_id' => $validated['winner_user_id']
                ? ($validated['winner_user_id'] == $validated['player1_user_id']
                    ? $validated['player2_user_id']
                    : $validated['player1_user_id'])
                : null,
            'player1_marks' => $validated['player1_marks'],
            'player2_marks' => $validated['player2_marks'],
            'player1_points' => $validated['player1_points'],
            'player2_points' => $validated['player2_points'],
            'began_at' => now(),
            'ended_at' => now(),
            'total_time' => 0,
        ]);

        return response()->json($match, 201);
    }

}