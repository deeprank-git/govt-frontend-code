export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      answer_keys: {
        Row: {
          answer_key_url: string | null
          challenge_open: boolean | null
          created_at: string
          exam_id: string | null
          id: string
          released_on: string | null
          response_sheet_url: string | null
          tier: string | null
          title: string
        }
        Insert: {
          answer_key_url?: string | null
          challenge_open?: boolean | null
          created_at?: string
          exam_id?: string | null
          id?: string
          released_on?: string | null
          response_sheet_url?: string | null
          tier?: string | null
          title: string
        }
        Update: {
          answer_key_url?: string | null
          challenge_open?: boolean | null
          created_at?: string
          exam_id?: string | null
          id?: string
          released_on?: string | null
          response_sheet_url?: string | null
          tier?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "answer_keys_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      attempts: {
        Row: {
          accuracy: number | null
          answers: Json
          correct_count: number | null
          id: string
          marked_for_review: Json
          percentile: number | null
          rank: number | null
          score: number | null
          section_analysis: Json | null
          skipped_count: number | null
          started_at: string
          status: string
          submitted_at: string | null
          test_id: string
          time_taken_seconds: number | null
          total_marks: number | null
          user_id: string
          visited: Json
          wrong_count: number | null
        }
        Insert: {
          accuracy?: number | null
          answers?: Json
          correct_count?: number | null
          id?: string
          marked_for_review?: Json
          percentile?: number | null
          rank?: number | null
          score?: number | null
          section_analysis?: Json | null
          skipped_count?: number | null
          started_at?: string
          status?: string
          submitted_at?: string | null
          test_id: string
          time_taken_seconds?: number | null
          total_marks?: number | null
          user_id: string
          visited?: Json
          wrong_count?: number | null
        }
        Update: {
          accuracy?: number | null
          answers?: Json
          correct_count?: number | null
          id?: string
          marked_for_review?: Json
          percentile?: number | null
          rank?: number | null
          score?: number | null
          section_analysis?: Json | null
          skipped_count?: number | null
          started_at?: string
          status?: string
          submitted_at?: string | null
          test_id?: string
          time_taken_seconds?: number | null
          total_marks?: number | null
          user_id?: string
          visited?: Json
          wrong_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "attempts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "mock_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      bookmarks: {
        Row: {
          created_at: string
          id: string
          item_id: string
          item_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          item_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          exam_count: number | null
          icon: string | null
          id: string
          name: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          exam_count?: number | null
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          exam_count?: number | null
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      current_affairs: {
        Row: {
          category: string
          content: string | null
          created_at: string
          id: string
          image_url: string | null
          is_featured: boolean | null
          published_at: string
          slug: string
          summary: string | null
          title: string
        }
        Insert: {
          category?: string
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          published_at?: string
          slug: string
          summary?: string | null
          title: string
        }
        Update: {
          category?: string
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          published_at?: string
          slug?: string
          summary?: string | null
          title?: string
        }
        Relationships: []
      }
      exams: {
        Row: {
          apply_url: string | null
          books: Json | null
          category_id: string | null
          conducting_body: string | null
          created_at: string
          cutoff: Json | null
          description: string | null
          eligibility: Json | null
          exam_pattern: Json | null
          faqs: Json | null
          id: string
          important_dates: Json | null
          is_featured: boolean | null
          level: string | null
          name: string
          notification_url: string | null
          overview: string | null
          preparation_tips: Json | null
          selection_process: Json | null
          short_name: string | null
          slug: string
          syllabus: Json | null
          test_count: number | null
        }
        Insert: {
          apply_url?: string | null
          books?: Json | null
          category_id?: string | null
          conducting_body?: string | null
          created_at?: string
          cutoff?: Json | null
          description?: string | null
          eligibility?: Json | null
          exam_pattern?: Json | null
          faqs?: Json | null
          id?: string
          important_dates?: Json | null
          is_featured?: boolean | null
          level?: string | null
          name: string
          notification_url?: string | null
          overview?: string | null
          preparation_tips?: Json | null
          selection_process?: Json | null
          short_name?: string | null
          slug: string
          syllabus?: Json | null
          test_count?: number | null
        }
        Update: {
          apply_url?: string | null
          books?: Json | null
          category_id?: string | null
          conducting_body?: string | null
          created_at?: string
          cutoff?: Json | null
          description?: string | null
          eligibility?: Json | null
          exam_pattern?: Json | null
          faqs?: Json | null
          id?: string
          important_dates?: Json | null
          is_featured?: boolean | null
          level?: string | null
          name?: string
          notification_url?: string | null
          overview?: string | null
          preparation_tips?: Json | null
          selection_process?: Json | null
          short_name?: string | null
          slug?: string
          syllabus?: Json | null
          test_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exams_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_tests: {
        Row: {
          attempt_count: number | null
          created_at: string
          description: string | null
          difficulty: string | null
          duration_minutes: number | null
          exam_id: string | null
          id: string
          is_free: boolean | null
          negative_marking: number | null
          paper_year: number | null
          shift: string | null
          test_type: string
          tier: string | null
          title: string
          total_marks: number | null
          total_questions: number | null
        }
        Insert: {
          attempt_count?: number | null
          created_at?: string
          description?: string | null
          difficulty?: string | null
          duration_minutes?: number | null
          exam_id?: string | null
          id?: string
          is_free?: boolean | null
          negative_marking?: number | null
          paper_year?: number | null
          shift?: string | null
          test_type?: string
          tier?: string | null
          title: string
          total_marks?: number | null
          total_questions?: number | null
        }
        Update: {
          attempt_count?: number | null
          created_at?: string
          description?: string | null
          difficulty?: string | null
          duration_minutes?: number | null
          exam_id?: string | null
          id?: string
          is_free?: boolean | null
          negative_marking?: number | null
          paper_year?: number | null
          shift?: string | null
          test_type?: string
          tier?: string | null
          title?: string
          total_marks?: number | null
          total_questions?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mock_tests_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          alert_date: string | null
          alert_type: string
          created_at: string
          description: string | null
          exam_id: string | null
          id: string
          is_new: boolean | null
          link: string | null
          title: string
        }
        Insert: {
          alert_date?: string | null
          alert_type?: string
          created_at?: string
          description?: string | null
          exam_id?: string | null
          id?: string
          is_new?: boolean | null
          link?: string | null
          title: string
        }
        Update: {
          alert_date?: string | null
          alert_type?: string
          created_at?: string
          description?: string | null
          exam_id?: string | null
          id?: string
          is_new?: boolean | null
          link?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string
          day_streak: number | null
          dob: string | null
          email: string | null
          full_name: string | null
          gender: string | null
          id: string
          mobile: string | null
          preferred_categories: string[] | null
          preparation_goal: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          day_streak?: number | null
          dob?: string | null
          email?: string | null
          full_name?: string | null
          gender?: string | null
          id: string
          mobile?: string | null
          preferred_categories?: string[] | null
          preparation_goal?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          day_streak?: number | null
          dob?: string | null
          email?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          mobile?: string | null
          preferred_categories?: string[] | null
          preparation_goal?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pyqs: {
        Row: {
          attempts: number | null
          created_at: string
          duration_minutes: number | null
          exam_id: string | null
          id: string
          marks: number | null
          paper_date: string | null
          pdf_url: string | null
          questions_count: number | null
          shift: string | null
          test_id: string | null
          tier: string | null
          title: string
          year: number
        }
        Insert: {
          attempts?: number | null
          created_at?: string
          duration_minutes?: number | null
          exam_id?: string | null
          id?: string
          marks?: number | null
          paper_date?: string | null
          pdf_url?: string | null
          questions_count?: number | null
          shift?: string | null
          test_id?: string | null
          tier?: string | null
          title: string
          year: number
        }
        Update: {
          attempts?: number | null
          created_at?: string
          duration_minutes?: number | null
          exam_id?: string | null
          id?: string
          marks?: number | null
          paper_date?: string | null
          pdf_url?: string | null
          questions_count?: number | null
          shift?: string | null
          test_id?: string | null
          tier?: string | null
          title?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "pyqs_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pyqs_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "mock_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          correct_answer: string
          created_at: string
          difficulty: string | null
          explanation: string | null
          id: string
          marks: number | null
          negative_marks: number | null
          options: Json
          question_number: number
          question_text: string
          section: string
          test_id: string
          topic: string | null
        }
        Insert: {
          correct_answer: string
          created_at?: string
          difficulty?: string | null
          explanation?: string | null
          id?: string
          marks?: number | null
          negative_marks?: number | null
          options: Json
          question_number: number
          question_text: string
          section?: string
          test_id: string
          topic?: string | null
        }
        Update: {
          correct_answer?: string
          created_at?: string
          difficulty?: string | null
          explanation?: string | null
          id?: string
          marks?: number | null
          negative_marks?: number | null
          options?: Json
          question_number?: number
          question_text?: string
          section?: string
          test_id?: string
          topic?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "mock_tests"
            referencedColumns: ["id"]
          },
        ]
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
          role?: Database["public"]["Enums"]["app_role"]
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
      questions_public: {
        Row: {
          created_at: string | null
          difficulty: string | null
          id: string | null
          marks: number | null
          negative_marks: number | null
          options: Json | null
          question_number: number | null
          question_text: string | null
          section: string | null
          test_id: string | null
          topic: string | null
        }
        Insert: {
          created_at?: string | null
          difficulty?: string | null
          id?: string | null
          marks?: number | null
          negative_marks?: number | null
          options?: Json | null
          question_number?: number | null
          question_text?: string | null
          section?: string | null
          test_id?: string | null
          topic?: string | null
        }
        Update: {
          created_at?: string | null
          difficulty?: string | null
          id?: string | null
          marks?: number | null
          negative_marks?: number | null
          options?: Json | null
          question_number?: number | null
          question_text?: string | null
          section?: string | null
          test_id?: string | null
          topic?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "mock_tests"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_attempt_questions: {
        Args: { _attempt_id: string }
        Returns: {
          correct_answer: string
          created_at: string
          difficulty: string | null
          explanation: string | null
          id: string
          marks: number | null
          negative_marks: number | null
          options: Json
          question_number: number
          question_text: string
          section: string
          test_id: string
          topic: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "questions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      submit_attempt: {
        Args: {
          _answers: Json
          _attempt_id: string
          _time_taken_seconds: number
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "student"
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
      app_role: ["admin", "student"],
    },
  },
} as const
