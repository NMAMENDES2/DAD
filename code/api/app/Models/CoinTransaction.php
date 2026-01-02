<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CoinTransaction extends Model
{
    use HasFactory;

    protected $table = 'coin_transactions';

    public $timestamps = false;

    protected $fillable = [
        'transaction_datetime',
        'user_id',
        'match_id',
        'game_id',
        'coin_transaction_type_id',
        'coins',
        'custom',
    ];

    public function type()
    {
        return $this->belongsTo(CoinTransactionType::class, 'coin_transaction_type_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

     public function game()
    {
        return $this->belongsTo(Game::class, 'game_id');
    }

     public function match()
    {
        return $this->belongsTo(Matches::class, 'match_id');
    }
}
