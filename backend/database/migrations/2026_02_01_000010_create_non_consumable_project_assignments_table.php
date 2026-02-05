<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('non_consumable_project_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('non_consumable_item_id')->constrained('non_consumable_items')->cascadeOnDelete();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->decimal('quantity', 15, 2)->default(0);
            $table->timestamps();

            $table->unique(['non_consumable_item_id', 'project_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('non_consumable_project_assignments');
    }
};
