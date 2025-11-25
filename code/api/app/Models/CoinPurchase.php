<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CoinPurchase extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $table = 'coin_purchases';

    protected $fillable = [
        'user_id',
        'purchase_datetime',
        'coin_transaction_id',
        'euros',
        'payment_type',
        'payment_reference',
        'custom',
    ];

    public function user(){
        return $this->belongsTo(User::class);
    }

    public function coinTransaction(){
        return $this->belongsTo(CoinTransaction::class);
    }
}
