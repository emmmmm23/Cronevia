<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\JournalEntry;
use App\Models\Memory;
use Illuminate\Http\Request;

class OnThisDayController extends Controller
{
    public function index(Request $request)
    {
        $todayMonth = now()->month;
        $todayDay = now()->day;
        $userId = $request->user()->id;

        $memories = Memory::query()
            ->where('user_id', $userId)
            ->whereMonth('memory_date', $todayMonth)
            ->whereDay('memory_date', $todayDay)
            ->get();

        $journals = JournalEntry::query()
            ->where('user_id', $userId)
            ->whereMonth('entry_date', $todayMonth)
            ->whereDay('entry_date', $todayDay)
            ->get();

        return response()->json([
            'data' => [
                'memories' => $memories,
                'journal_entries' => $journals,
            ],
        ]);
    }
}
