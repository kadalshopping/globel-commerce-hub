import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export interface Address {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

interface AddressFormProps {
  onSubmit: (address: Address) => void;
  onCancel: () => void;
  initialAddress?: Partial<Address>;
}

export const AddressForm = ({ onSubmit, onCancel, initialAddress }: AddressFormProps) => {
  const [address, setAddress] = useState<Address>({
    fullName: initialAddress?.fullName || '',
    phone: initialAddress?.phone || '',
    address: initialAddress?.address || '',
    city: initialAddress?.city || '',
    state: initialAddress?.state || '',
    pincode: initialAddress?.pincode || '',
  });

  const [errors, setErrors] = useState<Partial<Address>>({});

  const validateForm = () => {
    const newErrors: Partial<Address> = {};

    if (!address.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!address.phone.trim()) newErrors.phone = 'Phone number is required';
    if (!/^\d{10}$/.test(address.phone.replace(/\s/g, ''))) newErrors.phone = 'Please enter a valid 10-digit phone number';
    if (!address.address.trim()) newErrors.address = 'Address is required';
    if (!address.city.trim()) newErrors.city = 'City is required';
    if (!address.state.trim()) newErrors.state = 'State is required';
    if (!address.pincode.trim()) newErrors.pincode = 'Pincode is required';
    if (!/^\d{6}$/.test(address.pincode)) newErrors.pincode = 'Please enter a valid 6-digit pincode';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(address);
    }
  };

  const handleInputChange = (field: keyof Address, value: string) => {
    setAddress(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Delivery Address</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                value={address.fullName}
                onChange={(e) => handleInputChange('fullName', e.target.value)}
                placeholder="Enter your full name"
                className={errors.fullName ? 'border-destructive' : ''}
              />
              {errors.fullName && (
                <p className="text-sm text-destructive">{errors.fullName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                value={address.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="Enter your phone number"
                className={errors.phone ? 'border-destructive' : ''}
              />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address *</Label>
            <Textarea
              id="address"
              value={address.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="Enter your complete address"
              className={errors.address ? 'border-destructive' : ''}
              rows={3}
            />
            {errors.address && (
              <p className="text-sm text-destructive">{errors.address}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={address.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                placeholder="Enter your city"
                className={errors.city ? 'border-destructive' : ''}
              />
              {errors.city && (
                <p className="text-sm text-destructive">{errors.city}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State *</Label>
              <Input
                id="state"
                value={address.state}
                onChange={(e) => handleInputChange('state', e.target.value)}
                placeholder="Enter your state"
                className={errors.state ? 'border-destructive' : ''}
              />
              {errors.state && (
                <p className="text-sm text-destructive">{errors.state}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="pincode">Pincode *</Label>
              <Input
                id="pincode"
                value={address.pincode}
                onChange={(e) => handleInputChange('pincode', e.target.value)}
                placeholder="Enter pincode"
                className={errors.pincode ? 'border-destructive' : ''}
              />
              {errors.pincode && (
                <p className="text-sm text-destructive">{errors.pincode}</p>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">
              Save Address
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};