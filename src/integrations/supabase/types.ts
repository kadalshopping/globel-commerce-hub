export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      order_items: {
        Row: {
          created_at: string
          delivered_at: string | null
          dispatch_requested_at: string | null
          dispatched_at: string | null
          id: string
          order_id: string
          price: number
          product_id: string
          quantity: number
          shop_owner_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          dispatch_requested_at?: string | null
          dispatched_at?: string | null
          id?: string
          order_id: string
          price: number
          product_id: string
          quantity: number
          shop_owner_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          dispatch_requested_at?: string | null
          dispatched_at?: string | null
          id?: string
          order_id?: string
          price?: number
          product_id?: string
          quantity?: number
          shop_owner_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          delivery_address: Json
          id: string
          items: Json
          order_number: string
          payment_id: string | null
          payment_status: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          status: string
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delivery_address: Json
          id?: string
          items: Json
          order_number: string
          payment_id?: string | null
          payment_status?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          status?: string
          total_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          delivery_address?: Json
          id?: string
          items?: Json
          order_number?: string
          payment_id?: string | null
          payment_status?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payout_requests: {
        Row: {
          amount: number
          created_at: string
          id: string
          order_item_id: string
          processed_at: string | null
          requested_at: string
          shop_owner_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          order_item_id: string
          processed_at?: string | null
          requested_at?: string
          shop_owner_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          order_item_id?: string
          processed_at?: string | null
          requested_at?: string
          shop_owner_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_requests_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          admin_notes: string | null
          approved_at: string | null
          approved_by: string | null
          brand: string | null
          category: string | null
          created_at: string
          description: string | null
          discount_percentage: number | null
          id: string
          images: string[] | null
          mrp: number
          selling_price: number
          shop_owner_id: string
          sku: string | null
          status: Database["public"]["Enums"]["product_status"]
          stock_quantity: number | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          brand?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          discount_percentage?: number | null
          id?: string
          images?: string[] | null
          mrp: number
          selling_price: number
          shop_owner_id: string
          sku?: string | null
          status?: Database["public"]["Enums"]["product_status"]
          stock_quantity?: number | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          brand?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          discount_percentage?: number | null
          id?: string
          images?: string[] | null
          mrp?: number
          selling_price?: number
          shop_owner_id?: string
          sku?: string | null
          status?: Database["public"]["Enums"]["product_status"]
          stock_quantity?: number | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_product: {
        Args: { product_id: string; admin_notes_text?: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      reject_product: {
        Args: { product_id: string; admin_notes_text: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "shop_owner"
      product_status: "pending" | "approved" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user", "shop_owner"],
      product_status: ["pending", "approved", "rejected"],
    },
  },
} as const
