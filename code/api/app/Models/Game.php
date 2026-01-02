<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory; // <-- este
use Illuminate\Database\Eloquent\Model;

class Game extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'type',
        'status',
        'player1_user_id',
        'player2_user_id',
        'winner_user_id',
        'loser_user_id',
        'player1_points',
        'player2_points',
        'began_at',
        'ended_at',
        'total_time',
    ];

    public function match()
    {
        return $this->belongsTo(Matches::class, 'match_id');
    }

    public function player1()
    {
        return $this->belongsTo(User::class, 'player1_user_id');
    }

    public function player2()
    {
        return $this->belongsTo(User::class, 'player2_user_id');
    }

    public function winner()
    {
        return $this->belongsTo(User::class, 'winner_user_id');
    }
    
    public function loser()
    {
        return $this->belongsTo(User::class, 'loser_user_id');
    }
}
