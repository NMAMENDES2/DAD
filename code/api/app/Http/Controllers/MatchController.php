<?php
namespace App\Http\Controllers;

use App\Models\Matches;
use App\Models\Game;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MatchController extends Controller
{
    /**
     * Store a newly created match (multiplayer)
     */
    private function ensureNotAdmin(Request $request)
    {
        $user = $request->user();

        if ($user && $user->type === 'A') {
            return response()->json([
                'message' => 'Administrators cannot play games or hold coins.',
            ], 403);
        }

        return null;
    }

    public function index(Request $request)
    {
        $user = $request->user();

        $query = Matches::query()
        ->with(['player1', 'player2']);

        if (!$request->is('api/admin/*')) {
            $query->where(function ($q) use ($user) {
                $q->where('player1_user_id', $user->id)
                  ->orWhere('player2_user_id', $user->id);
            });
        }

        if ($request->filled('type')) {
            $query->where('type', $request->input('type'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('from')) {
            $query->where('began_at', '>=', $request->input('from'));
        }

        if ($request->filled('to')) {
            $query->where('began_at', '<=', $request->input('to'));
        }

        $sortBy = $request->input('sort_by', 'began_at');
        $direction = $request->input('sort_direction', 'desc');

        $matches = $query
            ->orderBy($sortBy, $direction)
            ->paginate($request->input('per_page', 20));

        return response()->json($matches);
    }
    public function store(Request $request)
    {

        if ($resp = $this->ensureNotAdmin($request)) {
            return $resp;
        }

        $validated = $request->validate([
            'type' => 'required|in:3,9',
            'status' => 'required|in:Pending,Playing,Ended,Interrupted',
            'player1_user_id' => 'required|integer|exists:users,id',
            'player2_user_id' => 'required|integer|exists:users,id',
            'player1_marks' => 'required|integer|min:0',
            'player2_marks' => 'required|integer|min:0',
            'player1_points' => 'required|integer|min:0',
            'player2_points' => 'required|integer|min:0',
            'winner_user_id' => 'nullable|integer|exists:users,id',
            'stake' => 'nullable|numeric|min:0',
        ]);

        // Determine loser
        $validated['loser_user_id'] = null;
        if ($validated['winner_user_id']) {
            $validated['loser_user_id'] = $validated['winner_user_id'] == $validated['player1_user_id'] 
                ? $validated['player2_user_id'] 
                : $validated['player1_user_id'];
        }

        $validated['began_at'] = now();
        if ($validated['status'] === 'Ended') {
            $validated['ended_at'] = now();
            $validated['total_time'] = 0; // Calculate if you track start time
        }

        $match = Matches::create($validated);

        return response()->json($match, 201);
    }

    /**
     * Store a multiplayer game
     */
    public function storeGame(Request $request)
    {

        if ($resp = $this->ensureNotAdmin($request)) {
            return $resp;
        }

        $validated = $request->validate([
            'type' => 'required|in:3,9',
            'status' => 'required|in:Pending,Playing,Ended,Interrupted',
            'player1_user_id' => 'required|integer|exists:users,id',
            'player2_user_id' => 'required|integer|exists:users,id',
            'player1_points' => 'required|integer|min:0',
            'player2_points' => 'required|integer|min:0',
            'winner_user_id' => 'nullable|integer|exists:users,id',
            'match_id' => 'nullable|integer|exists:matches,id',
        ]);

        // Determine loser
        $validated['loser_user_id'] = null;
        if ($validated['winner_user_id']) {
            $validated['loser_user_id'] = $validated['winner_user_id'] == $validated['player1_user_id'] 
                ? $validated['player2_user_id'] 
                : $validated['player1_user_id'];
        }

        $validated['began_at'] = now();
        if ($validated['status'] === 'Ended') {
            $validated['ended_at'] = now();
            $validated['total_time'] = 0;
        }

        $game = Game::create($validated);

        return response()->json($game, 201);
    }

    /**
     * Get all matches for the authenticated user
     */
    public function myMatches(Request $request)
    {
        $userId = $request->user()->id;
        
        $matches = Matches::where('player1_user_id', $userId)
            ->orWhere('player2_user_id', $userId)
            ->with(['player1', 'player2', 'winner'])
            ->orderBy('began_at', 'desc')
            ->paginate(15);

        return response()->json($matches);
    }

    /**
     * Get a specific match with all its games
     */
    public function show(Matches $match)
    {
        $match->load(['player1', 'player2', 'winner', 'games']);
        return response()->json($match);
    }
}