<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CoinTransactionType extends Model
{
    use HasFactory;

    // Table name (if different from pluralized model name)
    protected $table = 'coin_transaction_types';

    // Fillable attributes (columns that can be mass-assigned)
    protected $fillable = [
        'name',
        'type',
        'deleted_at',
        'custom',
    ];

    // Dates (soft deletes)
    protected $dates = ['deleted_at'];

    // Cast the custom column to an array for easy access
    protected $casts = [
        'custom' => 'array',
    ];

    // Relationships (if any)
    // e.g., A coin transaction type may have many coin transactions
    public function coinTransactions()
    {
        return $this->hasMany(CoinTransaction::class, 'coin_transaction_type_id');
    }
}

