<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role')->default('site_manager')->after('email');
            $table->boolean('can_edit')->nullable()->after('role');
            $table->boolean('can_delete')->nullable()->after('can_edit');
            $table->string('avatar')->nullable()->after('can_delete');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['role', 'can_edit', 'can_delete', 'avatar']);
        });
    }
};
