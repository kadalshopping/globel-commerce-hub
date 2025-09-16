import { useState } from 'react';
import { Star, ThumbsUp, MessageSquare, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { ImageWithSkeleton } from '@/components/ui/image-skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useProductReviews, useProductRating, useDeleteReview } from '@/hooks/useReviews';
import { ReviewForm } from './ReviewForm';
import { Review } from '@/types/review';

interface ReviewSectionProps {
  productId: string;
}

export const ReviewSection = ({ productId }: ReviewSectionProps) => {
  const { user } = useAuth();
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  
  const { data: reviews = [], isLoading: reviewsLoading } = useProductReviews(productId);
  const { data: rating } = useProductRating(productId);
  const deleteReview = useDeleteReview();

  const userReview = user ? reviews.find(review => review.user_id === user.id) : null;
  const canWriteReview = user && !userReview;

  const handleDeleteReview = (reviewId: string) => {
    deleteReview.mutate({ reviewId, productId });
  };

  const handleEditReview = (review: Review) => {
    setEditingReview(review);
    setShowReviewForm(true);
  };

  const closeForm = () => {
    setShowReviewForm(false);
    setEditingReview(null);
  };

  if (reviewsLoading) {
    return <div className="animate-pulse h-40"></div>;
  }

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      {rating && (
        <Card className="p-6">
          <div className="flex items-start gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-1">
                {rating.average_rating}
              </div>
              <div className="flex items-center justify-center mb-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < Math.floor(rating.average_rating)
                        ? 'fill-accent text-accent'
                        : 'text-muted-foreground'
                    }`}
                  />
                ))}
              </div>
              <div className="text-sm text-muted-foreground">
                Based on {rating.review_count} review{rating.review_count !== 1 ? 's' : ''}
              </div>
            </div>
            
            <div className="flex-1 space-y-2">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = rating[`${['', 'one', 'two', 'three', 'four', 'five'][stars]}_star_count` as keyof typeof rating] as number;
                const percentage = rating.review_count > 0 ? (count / rating.review_count) * 100 : 0;
                
                return (
                  <div key={stars} className="flex items-center gap-2 text-sm">
                    <span className="w-12">{stars} star</span>
                    <Progress value={percentage} className="flex-1 h-2" />
                    <span className="w-8 text-muted-foreground">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* Write Review Button */}
      {canWriteReview && (
        <div className="flex justify-center">
          <Button 
            onClick={() => setShowReviewForm(true)}
            className="gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            Write a Review
          </Button>
        </div>
      )}

      {/* Review Form */}
      {showReviewForm && (
        <ReviewForm
          productId={productId}
          existingReview={editingReview}
          onClose={closeForm}
        />
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Customer Reviews</h3>
        
        {reviews.length === 0 ? (
          <Card className="p-8 text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No reviews yet. Be the first to review this product!
            </p>
          </Card>
        ) : (
          reviews.map((review) => (
            <Card key={review.id} className="p-4">
              <div className="flex items-start gap-4">
                <Avatar className="h-10 w-10">
                  <ImageWithSkeleton
                    src={review.user_profile?.avatar_url || '/placeholder.svg'} 
                    alt={review.user_profile?.full_name || 'User'} 
                    className="h-full w-full object-cover"
                    optimizeSize={{ width: 64, height: 64, quality: 60 }}
                  />
                </Avatar>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        {review.user_profile?.full_name || 'Anonymous User'}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3 w-3 ${
                                i < review.rating
                                  ? 'fill-accent text-accent'
                                  : 'text-muted-foreground'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    
                    {user?.id === review.user_id && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditReview(review)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteReview(review.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {review.review_text && (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {review.review_text}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};