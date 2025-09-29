import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

interface SizeSelectorProps {
  sizes: string[];
  selectedSize?: string;
  onSizeSelect: (size: string) => void;
  className?: string;
}

export const SizeSelector = ({ sizes, selectedSize, onSizeSelect, className }: SizeSelectorProps) => {
  if (!sizes || sizes.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <Label className="text-base font-medium">Size</Label>
      <div className="flex flex-wrap gap-2 mt-2">
        {sizes.map((size) => (
          <Button
            key={size}
            variant={selectedSize === size ? "default" : "outline"}
            size="sm"
            onClick={() => onSizeSelect(size)}
            className="min-w-[40px] h-10"
          >
            {size}
          </Button>
        ))}
      </div>
      {selectedSize && (
        <Badge variant="secondary" className="mt-2">
          Selected: {selectedSize}
        </Badge>
      )}
    </div>
  );
};