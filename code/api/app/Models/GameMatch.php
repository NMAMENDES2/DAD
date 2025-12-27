<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GameMatch extends Model
{
    protected $table = 'matches';

    protected $fillable = [
        'type',
        'player1_user_id',
        'player2_user_id',
        'winner_user_id',
        'loser_user_id',
        'status',
        'stake',
        'began_at',
        'ended_at',
        'total_time',
        'player1_marks',
        'player2_marks',
        'player1_points',
        'player2_points',
        'custom',
    ];

    protected $casts = [
        'began_at' => 'datetime',
        'ended_at' => 'datetime',
        'custom' => 'array',
    ];
}
