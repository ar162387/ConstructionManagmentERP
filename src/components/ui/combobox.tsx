'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface ComboboxOption {
  value: string;
  label: string;
}

export interface ComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  disabled?: boolean;
  required?: boolean;
  /** Optional footer (e.g. "Add custom unit...") rendered after the list. Call close() to close the popover. */
  renderFooter?: (close: () => void) => React.ReactNode;
  /** When Combobox is inside a Dialog, pass the dialog content element to fix wheel scroll. */
  container?: HTMLElement | null;
}

export function Combobox({
  value,
  onValueChange,
  options,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No results found.',
  className,
  triggerClassName,
  contentClassName,
  disabled = false,
  required,
  renderFooter,
  container,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);

  // Normalize to string so selected option is found whether value/option.value are string or number (e.g. from API)
  const valueStr = value != null && value !== '' ? String(value).trim() : '';
  const selectedOption = options.find((opt) => String(opt.value).trim() === valueStr);
  const displayValue = selectedOption?.label ?? '';


  const handleSelect = (opt: ComboboxOption) => {
    const nextValue = String(opt.value).trim();
    onValueChange(nextValue);
    // Defer closing so parent state commits before popover unmounts; avoids label staying "Select item"
    requestAnimationFrame(() => setOpen(false));
  };

  // Each CommandItem must have a UNIQUE value (cmdk requirement). Use label + value so:
  // 1. cmdk filters by value - including label makes "Other", "Bag", etc. searchable
  // 2. value suffix ensures uniqueness when labels repeat
  const itemValue = (opt: ComboboxOption) => String(opt.value).trim();
  const itemFilterValue = (opt: ComboboxOption) =>
    `${opt.label} ${itemValue(opt)}`.trim();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal h-10 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            !displayValue && 'text-muted-foreground',
            triggerClassName,
            className,
          )}
        >
          <span className="truncate">{displayValue || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          'w-[var(--radix-popover-trigger-width)] max-h-[min(400px,80vh)] p-0 flex flex-col overflow-hidden',
          contentClassName
        )}
        container={container ?? undefined}
        align="start"
      >
        <Command
          className="min-h-0 flex-1 flex flex-col overflow-hidden"
          shouldFilter={true}
          filter={(value, search) => {
            if (!search || search.trim() === '') return 1;
            return value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
          }}
        >
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList className="max-h-none overflow-visible p-0">
            <ScrollArea className="h-[300px]">
              <div className="p-1">
                <CommandEmpty>{emptyMessage}</CommandEmpty>
                <CommandGroup className="overflow-visible p-0">
                  {options.map((opt) => (
                    <CommandItem
                      key={itemValue(opt)}
                      value={itemFilterValue(opt)}
                      onSelect={() => handleSelect(opt)}
                    >
                      <Check className={cn('mr-2 h-4 w-4', valueStr === itemValue(opt) ? 'opacity-100' : 'opacity-0')} />
                      <span className="truncate">{opt.label}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
                {renderFooter?.(() => setOpen(false))}
              </div>
            </ScrollArea>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
