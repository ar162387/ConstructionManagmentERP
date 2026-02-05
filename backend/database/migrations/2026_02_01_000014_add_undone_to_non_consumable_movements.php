<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('non_consumable_movements', function (Blueprint $table) {
            $table->timestamp('undone_at')->nullable()->after('idempotency_key');
            $table->foreignId('undone_by')->nullable()->after('undone_at')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('non_consumable_movements', function (Blueprint $table) {
            $table->dropForeign(['undone_by']);
            $table->dropColumn(['undone_at', 'undone_by']);
        });
    }
};
