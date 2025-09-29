import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ImageUpload } from '@/components/ui/image-upload';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useCreateProduct } from '@/hooks/useProducts';
import { X, Plus } from 'lucide-react';

const productSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  description: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  mrp: z.number().min(0.01, 'MRP must be greater than 0'),
  selling_price: z.number().min(0.01, 'Selling price must be greater than 0'),
  stock_quantity: z.number().min(0, 'Stock quantity cannot be negative').optional(),
  sku: z.string().optional(),
}).refine((data) => data.selling_price <= data.mrp, {
  message: 'Selling price cannot be higher than MRP',
  path: ['selling_price'],
});

type ProductFormData = z.infer<typeof productSchema>;

export const ProductForm = () => {
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [sizeInput, setSizeInput] = useState('');
  const [sizeType, setSizeType] = useState<'clothing' | 'shoes' | 'custom'>('clothing');
  
  const createProduct = useCreateProduct();
  
  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      title: '',
      description: '',
      category: '',
      brand: '',
      mrp: 0,
      selling_price: 0,
      stock_quantity: 0,
      sku: '',
    },
  });

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const addSize = () => {
    if (sizeInput.trim() && !sizes.includes(sizeInput.trim())) {
      setSizes([...sizes, sizeInput.trim()]);
      setSizeInput('');
    }
  };

  const removeSize = (sizeToRemove: string) => {
    setSizes(sizes.filter(size => size !== sizeToRemove));
  };

  const addPredefinedSizes = (predefinedSizes: string[]) => {
    const newSizes = predefinedSizes.filter(size => !sizes.includes(size));
    setSizes([...sizes, ...newSizes]);
  };

  const getCommonSizes = () => {
    switch (sizeType) {
      case 'clothing':
        return ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
      case 'shoes':
        return ['6', '7', '8', '9', '10', '11', '12'];
      default:
        return [];
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.currentTarget === document.querySelector('[data-tag-input]')) {
        addTag();
      } else if (e.currentTarget === document.querySelector('[data-size-input]')) {
        addSize();
      }
    }
  };

  const onSubmit = (data: ProductFormData) => {
    const discount_percentage = data.mrp > 0 
      ? ((data.mrp - data.selling_price) / data.mrp) * 100 
      : 0;

    createProduct.mutate({
      title: data.title,
      description: data.description,
      category: data.category,
      brand: data.brand,
      mrp: data.mrp,
      selling_price: data.selling_price,
      stock_quantity: data.stock_quantity,
      sku: data.sku,
      tags: tags.length > 0 ? tags : undefined,
      images: images.length > 0 ? images : undefined,
      sizes: sizes.length > 0 ? sizes : undefined,
      discount_percentage,
    });
  };

  const resetForm = () => {
    form.reset();
    setTags([]);
    setTagInput('');
    setImages([]);
    setSizes([]);
    setSizeInput('');
    setSizeType('clothing');
  };

  if (createProduct.isSuccess) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <h3 className="text-lg font-semibold text-success">Product Submitted Successfully!</h3>
            <p className="text-muted-foreground">
              Your product has been submitted for admin approval. You'll be notified once it's reviewed.
            </p>
            <Button onClick={resetForm}>Add Another Product</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Product</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Product Title *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter product title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter product description" 
                        rows={3}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Electronics" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter brand name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="mrp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>MRP (₹) *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        placeholder="0.00" 
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="selling_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Selling Price (₹) *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        placeholder="0.00" 
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="stock_quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock Quantity</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU</FormLabel>
                    <FormControl>
                      <Input placeholder="Product SKU" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Tags</label>
              <div className="flex gap-2">
                <Input
                  data-tag-input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Add tags (press Enter)"
                />
                <Button type="button" onClick={addTag} variant="outline">
                  Add
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => removeTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <label className="text-sm font-medium">Product Sizes</label>
              
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground">Size Type</label>
                  <Select value={sizeType} onValueChange={(value: 'clothing' | 'shoes' | 'custom') => setSizeType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background border shadow-lg z-50">
                      <SelectItem value="clothing">Clothing (XS, S, M, L, XL)</SelectItem>
                      <SelectItem value="shoes">Shoes (6, 7, 8, 9, 10, 11, 12)</SelectItem>
                      <SelectItem value="custom">Custom Sizes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {sizeType !== 'custom' && (
                  <div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => addPredefinedSizes(getCommonSizes())}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add All {sizeType === 'clothing' ? 'Clothing' : 'Shoe'} Sizes
                    </Button>
                  </div>
                )}

                <div className="flex gap-2">
                  <Input
                    data-size-input
                    value={sizeInput}
                    onChange={(e) => setSizeInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={sizeType === 'clothing' ? 'e.g., M, L, XL' : sizeType === 'shoes' ? 'e.g., 8, 9, 10' : 'Enter custom size'}
                  />
                  <Button type="button" onClick={addSize} variant="outline">
                    Add Size
                  </Button>
                </div>

                {sizes.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {sizes.map((size) => (
                      <Badge key={size} variant="outline" className="flex items-center gap-1">
                        {size}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => removeSize(size)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <ImageUpload
              onImagesChange={setImages}
              existingImages={images}
              maxImages={5}
            />
            
            <Button 
              type="submit" 
              className="w-full"
              disabled={createProduct.isPending}
            >
              {createProduct.isPending ? 'Submitting...' : 'Submit for Approval'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};