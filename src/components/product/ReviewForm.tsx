import { useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useCreateReview, useUpdateReview } from '@/hooks/useReviews';
import { Review } from '@/types/review';

interface ReviewFormProps {
  productId: string;
  existingReview?: Review | null;
  onClose: () => void;
}

export const ReviewForm = ({ productId, existingReview, onClose }: ReviewFormProps) => {
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [reviewText, setReviewText] = useState(existingReview?.review_text || '');
  const [hoveredRating, setHoveredRating] = useState(0);

  const createReview = useCreateReview();
  const updateReview = useUpdateReview();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) return;

    const reviewData = {
      product_id: productId,
      rating,
      review_text: reviewText.trim() || undefined,
    };

    if (existingReview) {
      updateReview.mutate(
        { reviewId: existingReview.id, reviewData },
        { onSuccess: onClose }
      );
    } else {
      createReview.mutate(reviewData, { onSuccess: onClose });
    }
  };

  const isLoading = createReview.isPending || updateReview.isPending;

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label className="text-base font-medium">
            {existingReview ? 'Update Your Review' : 'Write a Review'}
          </Label>
        </div>

        {/* Rating Stars */}
        <div className="space-y-2">
          <Label>Rating *</Label>
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => {
              const starValue = i + 1;
              const isActive = starValue <= (hoveredRating || rating);
              
              return (
                <button
                  key={i}
                  type="button"
                  className="p-1 rounded hover:bg-muted transition-colors"
                  onClick={() => setRating(starValue)}
                  onMouseEnter={() => setHoveredRating(starValue)}
                  onMouseLeave={() => setHoveredRating(0)}
                >
                  <Star
                    className={`h-6 w-6 transition-colors ${
                      isActive
                        ? 'fill-accent text-accent'
                        : 'text-muted-foreground hover:text-accent'
                    }`}
                  />
                </button>
              );
            })}
            {rating > 0 && (
              <span className="ml-2 text-sm text-muted-foreground">
                {rating} out of 5 stars
              </span>
            )}
          </div>
        </div>

        {/* Review Text */}
        <div className="space-y-2">
          <Label htmlFor="review-text">Review (Optional)</Label>
          <Textarea
            id="review-text"
            placeholder="Share your experience with this product..."
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            rows={4}
            maxLength={1000}
          />
          <div className="text-xs text-muted-foreground text-right">
            {reviewText.length}/1000 characters
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Button
            type="submit"
            disabled={rating === 0 || isLoading}
            className="flex-1"
          >
            {isLoading ? 'Submitting...' : existingReview ? 'Update Review' : 'Submit Review'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
};