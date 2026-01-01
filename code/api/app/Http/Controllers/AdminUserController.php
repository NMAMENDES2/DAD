<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminUserController extends Controller
{
    /**
     * Listar todos os utilizadores (players + admins).
     */
    public function index(Request $request)
    {
        $query = User::query()->withTrashed(); // incluir soft-deleted

        if ($request->has('type') && in_array($request->type, ['P', 'A'])) {
            $query->where('type', $request->type);
        }

        if ($request->has('blocked')) {
            $blocked = filter_var($request->blocked, FILTER_VALIDATE_BOOLEAN);
            $query->where('blocked', $blocked);
        }

        $users = $query->orderBy('created_at', 'desc')->paginate(
            $request->input('per_page', 20)
        );

        return response()->json([
            'data' => $users->items(),
            'meta' => [
                'current_page' => $users->currentPage(),
                'last_page'    => $users->lastPage(),
                'per_page'     => $users->perPage(),
                'total'        => $users->total(),
            ],
        ]);
    }

    /**
     * Criar um novo administrador (não público).
     */
    public function storeAdmin(Request $request)
    {
        $validated = $request->validate([
            'name'     => ['required', 'string', 'max:255'],
            'nickname' => ['required', 'string', 'max:255', 'unique:users,nickname'],
            'email'    => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
        ]);

        $admin = User::create([
            'name'      => $validated['name'],
            'nickname'  => $validated['nickname'],
            'email'     => $validated['email'],
            'password'  => bcrypt($validated['password']),
            'type'      => 'A',      // ADMIN
            'blocked'   => false,
            'coins_balance' => 0,    // admins não têm coins
        ]);

        return response()->json([
            'user'    => $admin,
            'message' => 'Administrator created successfully',
        ], 201);
    }

    /**
     * Bloquear jogador.
     */
    public function block(User $user, Request $request)
    {
        // não permitir bloquear a si próprio
        if ($user->id === $request->user()->id) {
            return response()->json([
                'message' => 'You cannot block your own account.',
            ], 400);
        }

        $user->blocked = true;
        $user->save();

        return response()->json([
            'message' => 'User blocked successfully',
            'user'    => $user,
        ]);
    }

    /**
     * Desbloquear jogador.
     */
    public function unblock(User $user)
    {
        $user->blocked = false;
        $user->save();

        return response()->json([
            'message' => 'User unblocked successfully',
            'user'    => $user,
        ]);
    }

    /**
     * Remover conta (soft delete para players com atividade).
     */
    public function destroy(User $user, Request $request)
    {
        if ($user->id === $request->user()->id) {
            return response()->json([
                'message' => 'You cannot delete your own account.',
            ], 400);
        }

        // regra simples: todos os players são soft-deleted
        if ($user->type === 'P') {
            $user->delete(); // SoftDeletes no modelo
        } else {
            // para admins, podes optar por nunca apagar ou forçar soft-delete
            $user->delete();
        }

        return response()->json([
            'message' => 'User removed successfully',
        ]);
    }
}
