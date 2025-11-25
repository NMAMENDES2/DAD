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
}
