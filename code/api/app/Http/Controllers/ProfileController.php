<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class ProfileController extends Controller
{
    public function updateEmail(Request $request){
        $user = $request->user();
        
        $validated = $request->validate([
            'email' => 'required|email|unique:users,email,' . $user->id,
        ]);
        
        error_log('Incoming email...'. $validated['email']);

        if($validated['email'] == $user->email){
            return response()->json([
                'message' => 'Cannot change to the same email.'
            ], 422);
        }
        
        $user->email = $validated['email'];
        $user->save();
        
        return response()->json([
            'message' => 'Email updated successfully.',
            'user' => $user
        ]);
    }  
    
    public function updateName(Request $request){
        $user = $request->user();
        
        $validated = $request->validate([
            'name' => 'required|string|max:255'
        ]);
        
        $user->name = $validated['name'];
        $user->save();
        
        return response()->json([
            'message' => 'Name updated successfully.',
            'user' => $user
        ]);
    }   
    
    public function updateNickname(Request $request){
        $user = $request->user();
        
        $validated = $request->validate([
            'nickname' => 'required|string|max:50', 
        ]);
        
        $user->nickname = $validated['nickname'];
        $user->save();
        
        return response()->json([
            'message' => 'Nickname updated successfully.',
            'user' => $user
        ]);
    }
    
    public function updatePassword(Request $request){
        $user = $request->user();
        
        $validated = $request->validate([
            'current_password' => 'required|string',
            'password' => 'required|string|confirmed', 
        ]);
        
        if(!Hash::check($validated['current_password'], $user->password)){
            return response()->json([
                'message' => 'Current password is incorrect.'
            ], 422);
        }
        
        $user->password = Hash::make($validated['password']);
        $user->save();
        
        return response()->json([
            'message' => 'Password updated successfully.',
            'user' => $user,
        ]);
    }
    
    public function updateAvatar(Request $request){
        $user = $request->user();
        
        $validated = $request->validate([
            'avatar' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);
        
        if($user->photo_filename && Storage::disk('public')->exists('avatars/' . $user->photo_avatar_filename)){
            Storage::disk('public')->delete('avatars/' . $user->photo_avatar_filename);
        }
        
        $file = $request->file('avatar');
        $filename = time() . '_' . $user->id . '.' . $file->getClientOriginalExtension();
        $file->storeAs('avatars', $filename, 'public');
        
        // Update user
        $user->photo_avatar_filename = $filename;
        $user->save();
        
        return response()->json([
            'message' => 'Avatar updated successfully.',
            'user' => $user,
            'avatar_url' => asset('storage/avatars/' . $filename)
        ]);
    }
    
    public function destroy(Request $request){
        $user = $request->user();
        
        $validated = $request->validate([
            'password' => 'required|string',
        ]);
        
        if(!Hash::check($validated['password'], $user->password)){
            return response()->json([
                'message' => 'Password is incorrect.'
            ], 422);
        }
        
        if($user->photo_avatar_filename && Storage::disk('public')->exists('avatars/' . $user->photo_avatar_filename)){
            Storage::disk('public')->delete('avatars/' . $user->photo_avatar_filename);
        }
        
        $user->delete();
        
        return response()->json([
            'message' => 'Account deleted successfully.'
        ]);
    }
}