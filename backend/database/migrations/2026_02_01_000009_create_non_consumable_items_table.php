<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('non_consumable_items', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->decimal('store_qty', 15, 2)->default(0);
            $table->decimal('damaged_qty', 15, 2)->default(0);
            $table->decimal('lost_qty', 15, 2)->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('non_consumable_items');
    }
};
