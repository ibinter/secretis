<?php
namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class UserController extends Controller
{
    public function index(Request $request)
    {
        return Inertia::render('Users/Index', ['users' => []]);
    }
    public function create(Request $request)
    {
        return Inertia::render('Users/Create', []);
    }
    public function store(Request $request) { return back(); }
    public function show(User $user) { return Inertia::render('Users/Show', ['user' => $user]); }
    public function edit(User $user) { return Inertia::render('Users/Edit', ['user' => $user]); }
    public function update(Request $request, User $user) { return back(); }
    public function destroy(User $user) { return back(); }
}
