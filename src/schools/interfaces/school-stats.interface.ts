export interface SchoolDashboardStats {
  overview: {
    total_students: number;
    total_teachers: number;
    total_documents: number;
    active_users: number;
  };
  enrollment: {
    current_month: number;
    previous_month: number;
    growth_rate: number;
  };
  documents: {
    uploaded_this_month: number;
    total_storage_used: number; // in bytes
    most_uploaded_type: string;
  };
  activity: {
    daily_active_users: number;
    weekly_active_users: number;
    monthly_active_users: number;
  };
  recent_activities: Array<{
    id: string;
    type: string;
    description: string;
    user_name: string;
    timestamp: Date;
  }>;
}

export interface SchoolRevenueAnalytics {
  total_revenue: number;
  monthly_revenue: Array<{
    month: string;
    year: number;
    amount: number;
    student_count: number;
  }>;
  revenue_by_grade: Array<{
    grade: string;
    amount: number;
    student_count: number;
  }>;
  payment_methods: Array<{
    method: string;
    amount: number;
    percentage: number;
  }>;
  outstanding_fees: {
    total_amount: number;
    student_count: number;
  };
}

export interface EnrollmentStatistics {
  current_enrollment: {
    total: number;
    by_grade: Array<{
      grade: string;
      count: number;
      capacity: number;
      utilization_rate: number;
    }>;
  };
  enrollment_trends: Array<{
    month: string;
    year: number;
    new_enrollments: number;
    withdrawals: number;
    net_change: number;
  }>;
  demographics: {
    gender_distribution: {
      male: number;
      female: number;
      other: number;
    };
    age_distribution: Array<{
      age_range: string;
      count: number;
    }>;
  };
  retention_rate: {
    current_year: number;
    previous_year: number;
    change: number;
  };
}