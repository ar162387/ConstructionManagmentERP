<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('non_consumable_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('non_consumable_item_id')->constrained('non_consumable_items')->cascadeOnDelete();
            $table->string('movement_type');
            $table->decimal('quantity', 15, 2);
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->decimal('cost', 15, 2)->nullable();
            $table->text('remarks')->nullable();
            $table->foreignId('created_by')->constrained('users')->nullOnDelete();
            $table->string('idempotency_key')->nullable()->unique();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('non_consumable_movements');
    }
};
