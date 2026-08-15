<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'bio')) {
                $table->text('bio')->nullable()->after('avatar_path');
            }
        });

        Schema::table('trips', function (Blueprint $table) {
            if (! Schema::hasColumn('trips', 'destination')) {
                $table->string('destination', 255)->nullable()->after('title');
            }
            if (! Schema::hasColumn('trips', 'budget')) {
                $table->decimal('budget', 12, 2)->nullable()->after('end_date');
            }
            if (! Schema::hasColumn('trips', 'currency')) {
                $table->char('currency', 3)->nullable()->after('budget');
            }
            if (! Schema::hasColumn('trips', 'cover_media_id')) {
                $table->uuid('cover_media_id')->nullable()->after('currency');
            }

        });

        Schema::table('trip_days', function (Blueprint $table) {
            if (! Schema::hasColumn('trip_days', 'updated_at')) {
                $table->timestamp('updated_at')->nullable()->after('created_at');
            }

            $table->unique(['trip_id', 'day_number']);
        });

        Schema::table('itinerary_items', function (Blueprint $table) {
            if (! Schema::hasColumn('itinerary_items', 'start_time')) {
                $table->time('start_time')->nullable()->after('scheduled_time');
            }
            if (! Schema::hasColumn('itinerary_items', 'end_time')) {
                $table->time('end_time')->nullable()->after('start_time');
            }
            if (! Schema::hasColumn('itinerary_items', 'estimated_cost')) {
                $table->decimal('estimated_cost', 12, 2)->nullable()->after('sort_order');
            }
            if (! Schema::hasColumn('itinerary_items', 'currency')) {
                $table->char('currency', 3)->nullable()->after('estimated_cost');
            }
            if (! Schema::hasColumn('itinerary_items', 'travel_time_minutes')) {
                $table->unsignedInteger('travel_time_minutes')->nullable()->after('currency');
            }
            if (! Schema::hasColumn('itinerary_items', 'notes')) {
                $table->text('notes')->nullable()->after('travel_time_minutes');
            }

        });

        Schema::table('locations', function (Blueprint $table) {
            if (! Schema::hasColumn('locations', 'province')) {
                $table->string('province', 100)->nullable()->after('city');
            }
            if (! Schema::hasColumn('locations', 'country')) {
                $table->string('country', 100)->nullable()->after('province');
            }
            if (! Schema::hasColumn('locations', 'place_type')) {
                $table->string('place_type', 100)->nullable()->after('country');
            }
            if (! Schema::hasColumn('locations', 'updated_at')) {
                $table->timestamp('updated_at')->nullable()->after('created_at');
            }

        });

        Schema::table('journal_entries', function (Blueprint $table) {
            if (! Schema::hasColumn('journal_entries', 'location_id')) {
                $table->uuid('location_id')->nullable()->after('trip_id');
            }
            if (! Schema::hasColumn('journal_entries', 'weather')) {
                $table->string('weather', 60)->nullable()->after('mood');
            }

        });

        Schema::table('memories', function (Blueprint $table) {
            if (! Schema::hasColumn('memories', 'location_id')) {
                $table->uuid('location_id')->nullable()->after('journal_entry_id');
            }

        });

        Schema::table('media', function (Blueprint $table) {
            if (! Schema::hasColumn('media', 'journal_entry_id')) {
                $table->uuid('journal_entry_id')->nullable()->after('memory_id');
            }
            if (! Schema::hasColumn('media', 'disk')) {
                $table->string('disk', 64)->nullable()->after('journal_entry_id');
            }
            if (! Schema::hasColumn('media', 'path')) {
                $table->string('path')->nullable()->after('disk');
            }
            if (! Schema::hasColumn('media', 'original_name')) {
                $table->string('original_name')->nullable()->after('original_filename');
            }
            if (! Schema::hasColumn('media', 'media_type')) {
                $table->enum('media_type', ['image', 'video', 'audio'])->nullable()->after('mime_type');
            }
            if (! Schema::hasColumn('media', 'size')) {
                $table->unsignedBigInteger('size')->nullable()->after('file_size');
            }
            if (! Schema::hasColumn('media', 'width')) {
                $table->unsignedInteger('width')->nullable()->after('size');
            }
            if (! Schema::hasColumn('media', 'height')) {
                $table->unsignedInteger('height')->nullable()->after('width');
            }
            if (! Schema::hasColumn('media', 'duration')) {
                $table->unsignedInteger('duration')->nullable()->after('height');
            }
            if (! Schema::hasColumn('media', 'updated_at')) {
                $table->timestamp('updated_at')->nullable()->after('created_at');
            }

        });

        Schema::table('people', function (Blueprint $table) {
            if (! Schema::hasColumn('people', 'nickname')) {
                $table->string('nickname', 100)->nullable()->after('name');
            }
            if (! Schema::hasColumn('people', 'notes')) {
                $table->text('notes')->nullable()->after('nickname');
            }
            if (! Schema::hasColumn('people', 'updated_at')) {
                $table->timestamp('updated_at')->nullable()->after('created_at');
            }

        });

        Schema::table('tags', function (Blueprint $table) {
            if (! Schema::hasColumn('tags', 'updated_at')) {
                $table->timestamp('updated_at')->nullable()->after('created_at');
            }

        });

        Schema::table('time_capsules', function (Blueprint $table) {
            if (! Schema::hasColumn('time_capsules', 'status')) {
                $table->enum('status', ['locked', 'unlocked', 'archived'])->default('locked')->after('unlock_at');
            }
        });

        Schema::table('future_letters', function (Blueprint $table) {
            if (! Schema::hasColumn('future_letters', 'status')) {
                $table->enum('status', ['locked', 'unlocked', 'archived'])->default('locked')->after('deliver_at');
            }
            if (! Schema::hasColumn('future_letters', 'updated_at')) {
                $table->timestamp('updated_at')->nullable()->after('created_at');
            }
        });

        if (! Schema::hasTable('memory_tags')) {
            Schema::create('memory_tags', function (Blueprint $table) {
                $table->uuid('memory_id');
                $table->uuid('tag_id');
                $table->timestamp('created_at')->useCurrent();

                $table->foreign('memory_id')->references('id')->on('memories')->cascadeOnDelete();
                $table->foreign('tag_id')->references('id')->on('tags')->cascadeOnDelete();

                $table->unique(['memory_id', 'tag_id']);
                $table->index('memory_id');
                $table->index('tag_id');
            });
        }

        if (! Schema::hasTable('memory_people')) {
            Schema::create('memory_people', function (Blueprint $table) {
                $table->uuid('memory_id');
                $table->uuid('person_id');
                $table->timestamp('created_at')->useCurrent();

                $table->foreign('memory_id')->references('id')->on('memories')->cascadeOnDelete();
                $table->foreign('person_id')->references('id')->on('people')->cascadeOnDelete();

                $table->unique(['memory_id', 'person_id']);
                $table->index('memory_id');
                $table->index('person_id');
            });
        }

        if (Schema::getConnection()->getDriverName() !== 'sqlite') {
            Schema::table('trips', function (Blueprint $table) {
                $table->foreign('cover_media_id')->references('id')->on('media')->nullOnDelete();
            });

            Schema::table('journal_entries', function (Blueprint $table) {
                $table->foreign('location_id')->references('id')->on('locations')->nullOnDelete();
            });

            Schema::table('memories', function (Blueprint $table) {
                $table->foreign('location_id')->references('id')->on('locations')->nullOnDelete();
            });

            Schema::table('media', function (Blueprint $table) {
                $table->foreign('journal_entry_id')->references('id')->on('journal_entries')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'sqlite') {
            Schema::table('media', function (Blueprint $table) {
                if (Schema::hasColumn('media', 'journal_entry_id')) {
                    $table->dropForeign(['journal_entry_id']);
                }
            });

            Schema::table('memories', function (Blueprint $table) {
                if (Schema::hasColumn('memories', 'location_id')) {
                    $table->dropForeign(['location_id']);
                }
            });

            Schema::table('journal_entries', function (Blueprint $table) {
                if (Schema::hasColumn('journal_entries', 'location_id')) {
                    $table->dropForeign(['location_id']);
                }
            });

            Schema::table('trips', function (Blueprint $table) {
                if (Schema::hasColumn('trips', 'cover_media_id')) {
                    $table->dropForeign(['cover_media_id']);
                }
            });
        }

        Schema::dropIfExists('memory_people');
        Schema::dropIfExists('memory_tags');
    }
};
