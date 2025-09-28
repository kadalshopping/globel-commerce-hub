import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  RotateCcw, 
  X, 
  Package,
  AlertTriangle,
  CheckCircle
} from "lucide-react";

interface OrderActionButtonsProps {
  order: {
    id: string;
    status: string;
    payment_status: string;
    order_number: string;
    created_at: string;
    total_amount: number;
  };
  onOrderUpdate: () => void;
}

type ActionType = 'return' | 'cancel' | null;

export const OrderActionButtons = ({ order, onOrderUpdate }: OrderActionButtonsProps) => {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [actionType, setActionType] = useState<ActionType>(null);
  const [returnReason, setReturnReason] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Determine if order can be cancelled or returned
  const canCancel = ['pending', 'confirmed'].includes(order.status);
  const canReturn = ['delivered'].includes(order.status);
  const orderAge = new Date().getTime() - new Date(order.created_at).getTime();
  const daysSinceOrder = Math.floor(orderAge / (1000 * 60 * 60 * 24));
  const withinReturnWindow = daysSinceOrder <= 30;

  const handleAction = (type: ActionType) => {
    setActionType(type);
    setShowDialog(true);
  };

  const processAction = async () => {
    if (!actionType) return;

    setIsProcessing(true);
    try {
      let updateData: any = {};
      let successMessage = "";

      if (actionType === 'cancel') {
        updateData = {
          status: 'cancelled',
          admin_notes: `Cancelled by user. Reason: ${cancelReason}`
        };
        successMessage = "Order cancelled successfully";
      } else if (actionType === 'return') {
        updateData = {
          status: 'return_requested',
          admin_notes: `Return requested by user. Reason: ${returnReason}`
        };
        successMessage = "Return request submitted successfully";
      }

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', order.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: successMessage,
      });

      setShowDialog(false);
      onOrderUpdate();
    } catch (error) {
      console.error('Error processing action:', error);
      toast({
        title: "Error",
        description: "Failed to process request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const returnReasons = [
    "Product damaged/defective",
    "Wrong item delivered",
    "Item doesn't match description",
    "Size/fit issues",
    "Quality not as expected",
    "Changed mind",
    "Other"
  ];

  const cancelReasons = [
    "Changed mind",
    "Found better price elsewhere", 
    "Delivery time too long",
    "Payment issues",
    "Ordered by mistake",
    "Other"
  ];

  return (
    <>
      <div className="flex gap-2">
        {canCancel && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAction('cancel')}
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Cancel Order
          </Button>
        )}
        
        {canReturn && withinReturnWindow && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAction('return')}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Return Item
          </Button>
        )}

        {canReturn && !withinReturnWindow && (
          <Badge variant="secondary" className="text-xs">
            Return window expired
          </Badge>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === 'cancel' ? (
                <>
                  <X className="h-5 w-5 text-red-600" />
                  Cancel Order
                </>
              ) : (
                <>
                  <RotateCcw className="h-5 w-5 text-blue-600" />
                  Return Request
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Order Info */}
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-4 w-4" />
                <span className="font-medium">Order #{order.order_number}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Total: ₹{order.total_amount.toLocaleString('en-IN')}
              </p>
            </div>

            {/* Reason Selection */}
            <div>
              <Label className="text-sm font-medium">
                Reason for {actionType === 'cancel' ? 'cancellation' : 'return'}
              </Label>
              <RadioGroup 
                value={actionType === 'cancel' ? cancelReason : returnReason}
                onValueChange={actionType === 'cancel' ? setCancelReason : setReturnReason}
                className="mt-2"
              >
                {(actionType === 'cancel' ? cancelReasons : returnReasons).map((reason) => (
                  <div key={reason} className="flex items-center space-x-2">
                    <RadioGroupItem value={reason} id={reason} />
                    <Label htmlFor={reason} className="text-sm cursor-pointer">
                      {reason}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Additional Comments */}
            <div>
              <Label htmlFor="additional-comments" className="text-sm font-medium">
                Additional Comments (Optional)
              </Label>
              <Textarea
                id="additional-comments"
                placeholder="Provide any additional details..."
                className="mt-1"
                rows={3}
              />
            </div>

            {/* Important Notice */}
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800">Important Notice</p>
                <p className="text-amber-700">
                  {actionType === 'cancel' 
                    ? "Order cancellation cannot be undone. Refund will be processed within 3-5 business days."
                    : "Return requests are subject to our return policy. Items must be in original condition."
                  }
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowDialog(false)}
                disabled={isProcessing}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={processAction}
                disabled={
                  isProcessing || 
                  (actionType === 'cancel' ? !cancelReason : !returnReason)
                }
                className="flex-1"
              >
                {isProcessing ? (
                  "Processing..."
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirm {actionType === 'cancel' ? 'Cancellation' : 'Return'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};