export type GoalStatus = 'draft' | 'in_review' | 'approved' | 'in_progress' | 'completed' | 'at_risk' | 'cancelled';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type CheckinStatus = 'on_track' | 'needs_attention' | 'blocked';

export interface Goal {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  thrust_area: string;
  uom_type: string;
  target: number;
  achievement: number;
  weightage: number;
  status: GoalStatus;
  approval_status: ApprovalStatus;
  locked_state: boolean;
  manager_feedback?: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Checkin {
  id: string;
  goal_id: string;
  author_id: string;
  status: CheckinStatus;
  achievement_update: number;
  notes: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: any;
  created_at: string;
}
