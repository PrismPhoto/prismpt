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
      app_settings: {
        Row: {
          brand_voice: string | null
          confirmation_enabled: boolean
          deposit_request_enabled: boolean
          draft_mode: boolean
          followup_days: number
          followup_enabled: boolean
          gcal_calendar_id: string | null
          gcal_connected: boolean
          gmail_connected: boolean
          id: number
          pre_event_reminder_days: number
          pre_event_reminder_enabled: boolean
        }
        Insert: {
          brand_voice?: string | null
          confirmation_enabled?: boolean
          deposit_request_enabled?: boolean
          draft_mode?: boolean
          followup_days?: number
          followup_enabled?: boolean
          gcal_calendar_id?: string | null
          gcal_connected?: boolean
          gmail_connected?: boolean
          id?: number
          pre_event_reminder_days?: number
          pre_event_reminder_enabled?: boolean
        }
        Update: {
          brand_voice?: string | null
          confirmation_enabled?: boolean
          deposit_request_enabled?: boolean
          draft_mode?: boolean
          followup_days?: number
          followup_enabled?: boolean
          gcal_calendar_id?: string | null
          gcal_connected?: boolean
          gmail_connected?: boolean
          id?: number
          pre_event_reminder_days?: number
          pre_event_reminder_enabled?: boolean
        }
        Relationships: []
      }
      automation_log: {
        Row: {
          draft_created: boolean
          event_id: string
          id: string
          notes: string | null
          sent: boolean
          trigger_type: string
          triggered_at: string
        }
        Insert: {
          draft_created?: boolean
          event_id: string
          id?: string
          notes?: string | null
          sent?: boolean
          trigger_type: string
          triggered_at?: string
        }
        Update: {
          draft_created?: boolean
          event_id?: string
          id?: string
          notes?: string | null
          sent?: boolean
          trigger_type?: string
          triggered_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      email_drafts: {
        Row: {
          body: string
          created_at: string
          event_id: string | null
          gmail_draft_id: string | null
          id: string
          lead_id: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["email_draft_status"]
          subject: string
          template_type: Database["public"]["Enums"]["email_template_type"]
          to_email: string
        }
        Insert: {
          body: string
          created_at?: string
          event_id?: string | null
          gmail_draft_id?: string | null
          id?: string
          lead_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["email_draft_status"]
          subject: string
          template_type: Database["public"]["Enums"]["email_template_type"]
          to_email: string
        }
        Update: {
          body?: string
          created_at?: string
          event_id?: string | null
          gmail_draft_id?: string | null
          id?: string
          lead_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["email_draft_status"]
          subject?: string
          template_type?: Database["public"]["Enums"]["email_template_type"]
          to_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_drafts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_drafts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          active: boolean
          body: string
          id: string
          key: string
          name: string
          subject: string
          template_type:
            | Database["public"]["Enums"]["email_template_type"]
            | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          body: string
          id?: string
          key: string
          name: string
          subject: string
          template_type?:
            | Database["public"]["Enums"]["email_template_type"]
            | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          body?: string
          id?: string
          key?: string
          name?: string
          subject?: string
          template_type?:
            | Database["public"]["Enums"]["email_template_type"]
            | null
          updated_at?: string
        }
        Relationships: []
      }
      event_extras: {
        Row: {
          created_at: string
          description: string | null
          event_id: string
          extra_type: Database["public"]["Enums"]["extra_type"]
          id: string
          photographer_id: string | null
          quantity: number
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_id: string
          extra_type: Database["public"]["Enums"]["extra_type"]
          id?: string
          photographer_id?: string | null
          quantity?: number
          total?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          event_id?: string
          extra_type?: Database["public"]["Enums"]["extra_type"]
          id?: string
          photographer_id?: string | null
          quantity?: number
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_extras_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_extras_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      event_photographers: {
        Row: {
          deposit_amount: number
          deposit_paid: boolean
          deposit_paid_date: string | null
          event_id: string
          external_name: string | null
          fee: number
          fee_paid: boolean
          fee_paid_date: string | null
          fee_payment_method: string | null
          final_payment_date: string | null
          final_payment_method: string | null
          final_payment_received: boolean
          final_payment_value: number
          id: string
          photographer_id: string | null
          position: number
          prism_commission: number
          role: Database["public"]["Enums"]["ep_role"] | null
        }
        Insert: {
          deposit_amount?: number
          deposit_paid?: boolean
          deposit_paid_date?: string | null
          event_id: string
          external_name?: string | null
          fee?: number
          fee_paid?: boolean
          fee_paid_date?: string | null
          fee_payment_method?: string | null
          final_payment_date?: string | null
          final_payment_method?: string | null
          final_payment_received?: boolean
          final_payment_value?: number
          id?: string
          photographer_id?: string | null
          position?: number
          prism_commission?: number
          role?: Database["public"]["Enums"]["ep_role"] | null
        }
        Update: {
          deposit_amount?: number
          deposit_paid?: boolean
          deposit_paid_date?: string | null
          event_id?: string
          external_name?: string | null
          fee?: number
          fee_paid?: boolean
          fee_paid_date?: string | null
          fee_payment_method?: string | null
          final_payment_date?: string | null
          final_payment_method?: string | null
          final_payment_received?: boolean
          final_payment_value?: number
          id?: string
          photographer_id?: string | null
          position?: number
          prism_commission?: number
          role?: Database["public"]["Enums"]["ep_role"] | null
        }
        Relationships: [
          {
            foreignKeyName: "event_photographers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_photographers_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          bride_dress: string | null
          bride_phone: string | null
          bride_prep_address: string | null
          catering_company: string | null
          ceremony_location: string | null
          ceremony_time: string | null
          client_name: string
          couple_names: string | null
          created_at: string
          decoration_company: string | null
          deposit_amount: number | null
          deposit_method: string | null
          deposit_paid: boolean
          deposit_paid_date: string | null
          email: string | null
          event_date: string
          event_notes: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          event_year: number | null
          final_date: string | null
          final_method: string | null
          final_payment_date: string | null
          final_payment_method: string | null
          final_payment_value: number | null
          final_value: number | null
          google_calendar_event_id: string | null
          groom_phone: string | null
          groom_prep_address: string | null
          has_pens_caixa: boolean
          id: string
          instagram_tags: string | null
          internal_notes: string | null
          lead_id: string | null
          location: string | null
          makeup_hair: string | null
          package_id: string | null
          package_snapshot: Json | null
          pax: number | null
          photo_permission: string | null
          pre_wedding_notes: string | null
          prism_commission: number
          reception_location: string | null
          status: Database["public"]["Enums"]["event_status"]
          total_value: number
          updated_at: string
          videographer: string | null
          wedding_planner_id: string | null
          wp_commission_value: number | null
        }
        Insert: {
          bride_dress?: string | null
          bride_phone?: string | null
          bride_prep_address?: string | null
          catering_company?: string | null
          ceremony_location?: string | null
          ceremony_time?: string | null
          client_name: string
          couple_names?: string | null
          created_at?: string
          decoration_company?: string | null
          deposit_amount?: number | null
          deposit_method?: string | null
          deposit_paid?: boolean
          deposit_paid_date?: string | null
          email?: string | null
          event_date: string
          event_notes?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          event_year?: number | null
          final_date?: string | null
          final_method?: string | null
          final_payment_date?: string | null
          final_payment_method?: string | null
          final_payment_value?: number | null
          final_value?: number | null
          google_calendar_event_id?: string | null
          groom_phone?: string | null
          groom_prep_address?: string | null
          has_pens_caixa?: boolean
          id?: string
          instagram_tags?: string | null
          internal_notes?: string | null
          lead_id?: string | null
          location?: string | null
          makeup_hair?: string | null
          package_id?: string | null
          package_snapshot?: Json | null
          pax?: number | null
          photo_permission?: string | null
          pre_wedding_notes?: string | null
          prism_commission?: number
          reception_location?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          total_value?: number
          updated_at?: string
          videographer?: string | null
          wedding_planner_id?: string | null
          wp_commission_value?: number | null
        }
        Update: {
          bride_dress?: string | null
          bride_phone?: string | null
          bride_prep_address?: string | null
          catering_company?: string | null
          ceremony_location?: string | null
          ceremony_time?: string | null
          client_name?: string
          couple_names?: string | null
          created_at?: string
          decoration_company?: string | null
          deposit_amount?: number | null
          deposit_method?: string | null
          deposit_paid?: boolean
          deposit_paid_date?: string | null
          email?: string | null
          event_date?: string
          event_notes?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          event_year?: number | null
          final_date?: string | null
          final_method?: string | null
          final_payment_date?: string | null
          final_payment_method?: string | null
          final_payment_value?: number | null
          final_value?: number | null
          google_calendar_event_id?: string | null
          groom_phone?: string | null
          groom_prep_address?: string | null
          has_pens_caixa?: boolean
          id?: string
          instagram_tags?: string | null
          internal_notes?: string | null
          lead_id?: string | null
          location?: string | null
          makeup_hair?: string | null
          package_id?: string | null
          package_snapshot?: Json | null
          pax?: number | null
          photo_permission?: string | null
          pre_wedding_notes?: string | null
          prism_commission?: number
          reception_location?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          total_value?: number
          updated_at?: string
          videographer?: string | null
          wedding_planner_id?: string | null
          wp_commission_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_wedding_planner_id_fkey"
            columns: ["wedding_planner_id"]
            isOneToOne: false
            referencedRelation: "wedding_planners"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_photographers: {
        Row: {
          lead_id: string
          photographer_id: string
        }
        Insert: {
          lead_id: string
          photographer_id: string
        }
        Update: {
          lead_id?: string
          photographer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_photographers_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_photographers_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          client_name: string
          converted_to_event_id: string | null
          created_at: string
          date_received: string
          email: string | null
          event_date: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          event_year: number | null
          id: string
          location: string | null
          notes: string | null
          package_id: string | null
          pax: number | null
          received_date: string | null
          source: Database["public"]["Enums"]["lead_source"] | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
          wedding_planner_id: string | null
        }
        Insert: {
          client_name: string
          converted_to_event_id?: string | null
          created_at?: string
          date_received?: string
          email?: string | null
          event_date?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          event_year?: number | null
          id?: string
          location?: string | null
          notes?: string | null
          package_id?: string | null
          pax?: number | null
          received_date?: string | null
          source?: Database["public"]["Enums"]["lead_source"] | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          wedding_planner_id?: string | null
        }
        Update: {
          client_name?: string
          converted_to_event_id?: string | null
          created_at?: string
          date_received?: string
          email?: string | null
          event_date?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          event_year?: number | null
          id?: string
          location?: string | null
          notes?: string | null
          package_id?: string | null
          pax?: number | null
          received_date?: string | null
          source?: Database["public"]["Enums"]["lead_source"] | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          wedding_planner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_converted_to_event_id_fkey"
            columns: ["converted_to_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_wedding_planner_id_fkey"
            columns: ["wedding_planner_id"]
            isOneToOne: false
            referencedRelation: "wedding_planners"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          active: boolean
          base_price: number
          created_at: string
          description: string | null
          fee_distribution: Json | null
          has_external: boolean
          has_external_photographer: boolean
          id: string
          name: string
          num_prism_photographers: number
          version: number
          wp_commission_10_price: number | null
          wp_commission_15_price: number | null
          wp_variant_percentage: number | null
        }
        Insert: {
          active?: boolean
          base_price: number
          created_at?: string
          description?: string | null
          fee_distribution?: Json | null
          has_external?: boolean
          has_external_photographer?: boolean
          id?: string
          name: string
          num_prism_photographers?: number
          version?: number
          wp_commission_10_price?: number | null
          wp_commission_15_price?: number | null
          wp_variant_percentage?: number | null
        }
        Update: {
          active?: boolean
          base_price?: number
          created_at?: string
          description?: string | null
          fee_distribution?: Json | null
          has_external?: boolean
          has_external_photographer?: boolean
          id?: string
          name?: string
          num_prism_photographers?: number
          version?: number
          wp_commission_10_price?: number | null
          wp_commission_15_price?: number | null
          wp_variant_percentage?: number | null
        }
        Relationships: []
      }
      photographer_availability: {
        Row: {
          available: boolean
          date: string
          google_calendar_event_id: string | null
          id: string
          notes: string | null
          photographer_id: string
        }
        Insert: {
          available?: boolean
          date: string
          google_calendar_event_id?: string | null
          id?: string
          notes?: string | null
          photographer_id: string
        }
        Update: {
          available?: boolean
          date?: string
          google_calendar_event_id?: string | null
          id?: string
          notes?: string | null
          photographer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photographer_availability_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      photographer_unavailability: {
        Row: {
          date: string
          id: string
          notes: string | null
          photographer_id: string
        }
        Insert: {
          date: string
          id?: string
          notes?: string | null
          photographer_id: string
        }
        Update: {
          date?: string
          id?: string
          notes?: string | null
          photographer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photographer_unavailability_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "photographers"
            referencedColumns: ["id"]
          },
        ]
      }
      photographers: {
        Row: {
          active: boolean
          created_at: string
          email: string | null
          full_name: string
          id: string
          initials: string
          personal_email: string | null
          prism_commission: number
          profile_id: string | null
          user_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          initials: string
          personal_email?: string | null
          prism_commission?: number
          profile_id?: string | null
          user_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          initials?: string
          personal_email?: string | null
          prism_commission?: number
          profile_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "photographers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          initials: string | null
          personal_email: string | null
          role: Database["public"]["Enums"]["app_role"] | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          initials?: string | null
          personal_email?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          initials?: string | null
          personal_email?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wedding_planners: {
        Row: {
          commission_percentage: number
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
        }
        Insert: {
          commission_percentage?: number
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
        }
        Update: {
          commission_percentage?: number
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_manager: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "manager" | "photographer"
      deposit_method: "revolut" | "bank_transfer" | "cyclik" | "other"
      email_draft_status: "draft" | "sent"
      email_template_type:
        | "proposta"
        | "followup"
        | "pedido_sinal"
        | "confirmacao"
        | "lembrete"
      ep_role: "primary" | "secondary" | "tertiary"
      event_status: "Confirmado" | "Aguarda Sinal" | "Cancelado"
      event_type: "Casamento" | "Corporate" | "Festa" | "Baptizado" | "Outro"
      extra_type:
        | "Deslocação"
        | "Estadia"
        | "Hora Extra"
        | "Pack Analógico Foto"
        | "Pack Analógico Video Super8"
        | "Sessão de Noivos"
        | "Pre-Wedding"
        | "Álbum Grande"
        | "Álbum Médio"
        | "Álbum Pequeno"
        | "Álbum Best Of"
        | "WoodBox"
        | "Outro"
      lead_source:
        | "email"
        | "website"
        | "instagram"
        | "wedding_planner"
        | "outro"
        | "other"
      lead_status: "Novo" | "Proposta Enviada" | "Adjudicado" | "Arquivo"
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
      app_role: ["manager", "photographer"],
      deposit_method: ["revolut", "bank_transfer", "cyclik", "other"],
      email_draft_status: ["draft", "sent"],
      email_template_type: [
        "proposta",
        "followup",
        "pedido_sinal",
        "confirmacao",
        "lembrete",
      ],
      ep_role: ["primary", "secondary", "tertiary"],
      event_status: ["Confirmado", "Aguarda Sinal", "Cancelado"],
      event_type: ["Casamento", "Corporate", "Festa", "Baptizado", "Outro"],
      extra_type: [
        "Deslocação",
        "Estadia",
        "Hora Extra",
        "Pack Analógico Foto",
        "Pack Analógico Video Super8",
        "Sessão de Noivos",
        "Pre-Wedding",
        "Álbum Grande",
        "Álbum Médio",
        "Álbum Pequeno",
        "Álbum Best Of",
        "WoodBox",
        "Outro",
      ],
      lead_source: [
        "email",
        "website",
        "instagram",
        "wedding_planner",
        "outro",
        "other",
      ],
      lead_status: ["Novo", "Proposta Enviada", "Adjudicado", "Arquivo"],
    },
  },
} as const
