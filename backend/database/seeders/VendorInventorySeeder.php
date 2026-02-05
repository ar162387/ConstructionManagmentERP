<?php

namespace Database\Seeders;

use App\Models\ConsumableItem;
use App\Models\Project;
use App\Models\StockConsumptionEntry;
use App\Models\StockConsumptionLineItem;
use App\Models\Unit;
use App\Models\User;
use App\Models\Vendor;
use App\Models\VendorInvoice;
use App\Models\VendorInvoiceLineItem;
use App\Models\VendorInvoicePayment;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class VendorInventorySeeder extends Seeder
{
    /**
     * Seed vendors, consumable inventory, vendor invoices, and stock consumption
     * for the "Burj al Arab" project using Faker.
     */
    public function run(): void
    {
        $faker = \Faker\Factory::create();

        $admin = User::where('role', 'admin')->first();
        $siteManager = User::where('role', 'site_manager')->first();
        $createdBy = $admin ?? User::first();

        if (! $createdBy) {
            $this->command->warn('No users found. Run DatabaseSeeder first.');
            return;
        }

        DB::transaction(function () use ($faker, $createdBy, $siteManager) {
            // 1. Project: Burj al Arab
            $project = Project::updateOrCreate(
                ['name' => 'Burj al Arab'],
                [
                    'description' => 'Luxury hotel and construction project - iconic sail-shaped structure',
                    'status' => 'active',
                    'budget' => 250000000,
                    'spent' => 0,
                    'start_date' => $faker->dateTimeBetween('-1 year', 'now'),
                    'end_date' => $faker->dateTimeBetween('now', '+2 years'),
                    'manager_id' => $siteManager?->id,
                ]
            );

            if ($siteManager) {
                $siteManager->assignedProjects()->syncWithoutDetaching([$project->id]);
            }

            // 2. Units
            $unitNames = [
                ['name' => 'Pieces', 'symbol' => 'pcs'],
                ['name' => 'Bags', 'symbol' => 'bags'],
                ['name' => 'Kilograms', 'symbol' => 'kg'],
                ['name' => 'Tons', 'symbol' => 'tons'],
                ['name' => 'Liters', 'symbol' => 'L'],
                ['name' => 'Cubic Meters', 'symbol' => 'm³'],
                ['name' => 'Square Meters', 'symbol' => 'm²'],
                ['name' => 'Meters', 'symbol' => 'm'],
                ['name' => 'Boxes', 'symbol' => 'box'],
                ['name' => 'Rolls', 'symbol' => 'roll'],
            ];
            $units = [];
            foreach ($unitNames as $u) {
                $units[] = Unit::firstOrCreate(
                    ['name' => $u['name']],
                    ['symbol' => $u['symbol']]
                );
            }

            // 3. Vendors (multiple)
            $vendorNames = [
                'Emirates Building Materials LLC',
                'Dubai Steel & Cement Co.',
                'Gulf Sands Suppliers',
                'Arabian Glass & Aluminum',
                'Premium Tiles & Marble',
                'Desert Lumber Trading',
                'Ocean View Electrical Supplies',
                'Burj Construction Equipment Rentals',
                'Al Fahidi Paints & Coatings',
                'Palm Plumbing & HVAC',
            ];
            $vendors = [];
            foreach ($vendorNames as $name) {
                $vendors[] = Vendor::firstOrCreate(
                    ['name' => $name],
                    [
                        'contact_person' => $faker->name(),
                        'phone' => $faker->phoneNumber(),
                        'email' => $faker->unique()->companyEmail(),
                    ]
                );
            }

            // 4. Consumable items (inventory)
            $consumableTemplates = [
                ['name' => 'Portland Cement', 'unit_index' => 1], // Bags
                ['name' => 'Steel Rebar 12mm', 'unit_index' => 2], // kg
                ['name' => 'Steel Rebar 16mm', 'unit_index' => 2],
                ['name' => 'Sand (Fine)', 'unit_index' => 5], // m³
                ['name' => 'Gravel 20mm', 'unit_index' => 5],
                ['name' => 'Bricks (Red)', 'unit_index' => 0], // pcs
                ['name' => 'Blocks (AAC)', 'unit_index' => 0],
                ['name' => 'Glass Panels 12mm', 'unit_index' => 6], // m²
                ['name' => 'Aluminum Profiles', 'unit_index' => 7], // m
                ['name' => 'Marble Tiles 60x60', 'unit_index' => 6],
                ['name' => 'Ceramic Tiles', 'unit_index' => 6],
                ['name' => 'Paint (White)', 'unit_index' => 4], // L
                ['name' => 'Primer', 'unit_index' => 4],
                ['name' => 'Electrical Cable 4mm', 'unit_index' => 7],
                ['name' => 'PVC Pipes 4"', 'unit_index' => 7],
                ['name' => 'Insulation Rolls', 'unit_index' => 8], // box
                ['name' => 'Waterproofing Membrane', 'unit_index' => 6],
            ];
            $consumables = [];
            foreach ($consumableTemplates as $t) {
                $unit = $units[$t['unit_index'] % count($units)];
                $consumables[] = ConsumableItem::firstOrCreate(
                    ['name' => $t['name']],
                    [
                        'unit_id' => $unit->id,
                        'current_stock' => 0,
                    ]
                );
            }

            // 5. Vendor invoices with line items (adds to stock)
            $invoiceCount = 0;
            foreach (array_slice($vendors, 0, 6) as $vendor) {
                $numInvoices = $faker->numberBetween(1, 3);
                for ($i = 0; $i < $numInvoices; $i++) {
                    $invoiceCount++;
                    $invoiceDate = $faker->dateTimeBetween('-6 months', 'now');
                    $lineItemsData = [];
                    $totalAmount = 0;
                    $selectedConsumables = $faker->randomElements($consumables, $faker->numberBetween(2, 5));
                    foreach ($selectedConsumables as $item) {
                        $qty = $faker->randomFloat(2, 10, 500);
                        $unitCost = $faker->randomFloat(2, 5, 500);
                        $lineTotal = round($qty * $unitCost, 2);
                        $totalAmount += $lineTotal;
                        $lineItemsData[] = [
                            'consumable_item_id' => $item->id,
                            'quantity' => $qty,
                            'unit_cost' => $unitCost,
                            'line_total' => $lineTotal,
                        ];
                    }
                    $totalAmount = round($totalAmount, 2);

                    $invoice = VendorInvoice::create([
                        'vendor_id' => $vendor->id,
                        'vehicle_number' => 'TRK-' . $faker->numerify('####'),
                        'bilty_number' => 'BLT-' . $faker->numerify('#####'),
                        'invoice_date' => $invoiceDate,
                        'invoice_number' => 'INV-' . $invoiceDate->format('Y') . '-' . str_pad((string) $invoiceCount, 3, '0', STR_PAD_LEFT),
                        'total_amount' => $totalAmount,
                        'paid_amount' => 0,
                        'remaining_amount' => $totalAmount,
                        'created_by' => $createdBy->id,
                    ]);

                    foreach ($lineItemsData as $line) {
                        VendorInvoiceLineItem::create([
                            'vendor_invoice_id' => $invoice->id,
                            'consumable_item_id' => $line['consumable_item_id'],
                            'quantity' => $line['quantity'],
                            'unit_cost' => $line['unit_cost'],
                            'line_total' => $line['line_total'],
                        ]);
                        ConsumableItem::where('id', $line['consumable_item_id'])->increment('current_stock', $line['quantity']);
                    }
                }
            }

            // 6. Vendor invoice payments (partial and full)
            $invoices = VendorInvoice::with('vendor')->get();
            $paymentModes = ['cash', 'bank_transfer', 'cheque'];
            foreach ($invoices as $inv) {
                $remaining = (float) $inv->remaining_amount;
                if ($remaining <= 0) {
                    continue;
                }
                $payCount = $faker->numberBetween(0, 2);
                $paidSoFar = 0;
                for ($p = 0; $p < $payCount && $remaining > 0; $p++) {
                    $amount = $p === $payCount - 1 && $faker->boolean(60)
                        ? $remaining
                        : $faker->randomFloat(2, 0.1, min($remaining, $remaining * 0.7));
                    $amount = round(min($amount, $remaining), 2);
                    if ($amount <= 0) {
                        break;
                    }
                    VendorInvoicePayment::create([
                        'vendor_invoice_id' => $inv->id,
                        'amount' => $amount,
                        'date' => $faker->dateTimeBetween($inv->invoice_date->format('Y-m-d'), 'now'),
                        'payment_mode' => $faker->randomElement($paymentModes),
                        'reference' => $faker->optional(0.7)->regexify('CHQ-[0-9]{4}'),
                        'created_by' => $createdBy->id,
                    ]);
                    $paidSoFar += $amount;
                    $remaining -= $amount;
                }
                if ($paidSoFar > 0) {
                    $newPaid = (float) $inv->paid_amount + $paidSoFar;
                    $newRemaining = (float) $inv->remaining_amount - $paidSoFar;
                    $inv->update([
                        'paid_amount' => $newPaid,
                        'remaining_amount' => $newRemaining,
                    ]);
                }
            }

            // 7. Stock consumption entries for Burj al Arab (deducts from stock)
            $remarksTemplates = [
                'Foundation work - Tower A',
                'Column casting - Level 3',
                'Slab pouring - Block B',
                'MEP rough-in - Floor 5',
                'Facade installation - North face',
                'Interior partition - Guest rooms',
                'Waterproofing - Basement',
                'Electrical conduit - Level 2',
                'Plumbing - Service core',
                'Paint application - Lobby',
            ];
            $numEntries = $faker->numberBetween(8, 15);
            for ($e = 0; $e < $numEntries; $e++) {
                $entry = StockConsumptionEntry::create([
                    'project_id' => $project->id,
                    'remarks' => $faker->randomElement($remarksTemplates) . ' - ' . $faker->date('M d, Y'),
                    'created_by' => $createdBy->id,
                ]);
                $selectedConsumables = $faker->randomElements($consumables, $faker->numberBetween(1, 4));
                foreach ($selectedConsumables as $item) {
                    $item->refresh();
                    $available = (float) $item->current_stock;
                    if ($available <= 0) {
                        continue;
                    }
                    $qty = round($faker->randomFloat(2, 0.5, min($available, 100)), 2);
                    if ($qty <= 0) {
                        continue;
                    }
                    StockConsumptionLineItem::create([
                        'stock_consumption_entry_id' => $entry->id,
                        'consumable_item_id' => $item->id,
                        'quantity' => $qty,
                    ]);
                    ConsumableItem::where('id', $item->id)->decrement('current_stock', $qty);
                }
            }
        });

        $this->command->info('VendorInventorySeeder: Burj al Arab project with vendors, inventory, invoices, and stock consumption seeded.');
    }
}
