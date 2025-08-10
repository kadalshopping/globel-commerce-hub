import { useState } from 'react';
import { Product } from '@/types/product';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useApproveProduct, useRejectProduct } from '@/hooks/useProducts';
import { Check, X, Package, DollarSign, Tag } from 'lucide-react';

interface ProductApprovalCardProps {
  product: Product;
}

export const ProductApprovalCard = ({ product }: ProductApprovalCardProps) => {
  const [adminNotes, setAdminNotes] = useState('');
  const [showNotesInput, setShowNotesInput] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  
  const approveProduct = useApproveProduct();
  const rejectProduct = useRejectProduct();

  const handleApprove = () => {
    setActionType('approve');
    setShowNotesInput(true);
  };

  const handleReject = () => {
    setActionType('reject');
    setShowNotesInput(true);
  };

  const handleConfirmAction = () => {
    if (actionType === 'approve') {
      approveProduct.mutate({ productId: product.id, adminNotes });
    } else if (actionType === 'reject') {
      rejectProduct.mutate({ productId: product.id, adminNotes });
    }
    
    setShowNotesInput(false);
    setActionType(null);
    setAdminNotes('');
  };

  const handleCancel = () => {
    setShowNotesInput(false);
    setActionType(null);
    setAdminNotes('');
  };

  const discountAmount = product.mrp - product.selling_price;
  const discountPercentage = ((discountAmount / product.mrp) * 100).toFixed(0);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg line-clamp-2">{product.title}</CardTitle>
          <Badge variant="outline" className="ml-2">
            {product.status}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {product.description && (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {product.description}
          </p>
        )}
        
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">MRP</p>
              <p className="font-semibold">₹{product.mrp}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-success" />
            <div>
              <p className="text-sm text-muted-foreground">Selling Price</p>
              <p className="font-semibold text-success">₹{product.selling_price}</p>
            </div>
          </div>
        </div>
        
        {discountAmount > 0 && (
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Discount</p>
              <p className="font-semibold text-primary">
                ₹{discountAmount} ({discountPercentage}% off)
              </p>
            </div>
          </div>
        )}
        
        {product.category && (
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Category</p>
              <p className="font-medium">{product.category}</p>
            </div>
          </div>
        )}
        
        {product.stock_quantity !== undefined && (
          <div>
            <p className="text-sm text-muted-foreground">Stock Quantity</p>
            <p className="font-medium">{product.stock_quantity} units</p>
          </div>
        )}
        
        {product.tags && product.tags.length > 0 && (
          <div>
            <p className="text-sm text-muted-foreground mb-2">Tags</p>
            <div className="flex flex-wrap gap-1">
              {product.tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {showNotesInput && (
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Admin Notes {actionType === 'reject' && <span className="text-destructive">*</span>}
            </label>
            <Textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder={
                actionType === 'approve'
                  ? 'Optional notes for approval...'
                  : 'Required: Please provide reason for rejection...'
              }
              rows={3}
            />
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex gap-2">
        {!showNotesInput ? (
          <>
            <Button
              onClick={handleApprove}
              className="flex-1"
              disabled={approveProduct.isPending || rejectProduct.isPending}
            >
              <Check className="h-4 w-4 mr-2" />
              Approve
            </Button>
            <Button
              onClick={handleReject}
              variant="destructive"
              className="flex-1"
              disabled={approveProduct.isPending || rejectProduct.isPending}
            >
              <X className="h-4 w-4 mr-2" />
              Reject
            </Button>
          </>
        ) : (
          <>
            <Button
              onClick={handleConfirmAction}
              variant={actionType === 'approve' ? 'default' : 'destructive'}
              disabled={
                (actionType === 'reject' && !adminNotes.trim()) ||
                approveProduct.isPending ||
                rejectProduct.isPending
              }
            >
              Confirm {actionType}
            </Button>
            <Button
              onClick={handleCancel}
              variant="outline"
              disabled={approveProduct.isPending || rejectProduct.isPending}
            >
              Cancel
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
};