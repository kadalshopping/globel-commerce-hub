export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  review_text?: string;
  created_at: string;
  updated_at: string;
  user_profile?: {
    full_name?: string;
    avatar_url?: string;
  };
}

export interface ProductRating {
  product_id: string;
  review_count: number;
  average_rating: number;
  five_star_count: number;
  four_star_count: number;
  three_star_count: number;
  two_star_count: number;
  one_star_count: number;
}

export interface CreateReviewData {
  product_id: string;
  rating: number;
  review_text?: string;
}