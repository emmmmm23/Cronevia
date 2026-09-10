<?php

namespace App\Providers;

use App\Models\JournalEntry;
use App\Models\User;
use App\Models\Location;
use App\Models\Memory;
use App\Models\Person;
use App\Models\Tag;
use App\Models\TimeCapsule;
use App\Models\Trip;
use App\Models\FutureLetter;
use App\Policies\FutureLetterPolicy;
use App\Policies\JournalEntryPolicy;
use App\Policies\LocationPolicy;
use App\Policies\MemoryPolicy;
use App\Policies\PersonPolicy;
use App\Policies\SuperAdminPolicy;
use App\Policies\TagPolicy;
use App\Policies\TimeCapsulePolicy;
use App\Policies\TripPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::policy(Trip::class, TripPolicy::class);
        Gate::policy(JournalEntry::class, JournalEntryPolicy::class);
        Gate::policy(Memory::class, MemoryPolicy::class);
        Gate::policy(Location::class, LocationPolicy::class);
        Gate::policy(Tag::class, TagPolicy::class);
        Gate::policy(Person::class, PersonPolicy::class);
        Gate::policy(TimeCapsule::class, TimeCapsulePolicy::class);
        Gate::policy(FutureLetter::class, FutureLetterPolicy::class);
        Gate::policy(User::class, SuperAdminPolicy::class);
    }
}

