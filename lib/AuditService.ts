import { supabase } from './supabaseClient';
import { AuditSeverity, AuditEventType } from '../types';

export interface AuditPayload {
  action: string;
  type: AuditEventType;
  severity: AuditSeverity;
  target?: string; // Resource ID
  details?: any;
}

/**
 * PHRONT MAESTRO: Audit Service
 * Central authority for logging all sensitive actions in the system.
 * Enforces security protocols and forensic traceability.
 */
export const AuditService = {
  /**
   * Log a secure action to the audit trail.
   * @param payload The audit event details.
   */
  logAction: async (payload: AuditPayload) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: session } = await supabase.auth.getSession();

      // Construct the secure log entry
      const logEntry = {
        actor_id: user?.id || 'system',
        actor_role: user?.role || 'system', // In real app, fetch from profile
        session_id: session?.session?.access_token?.slice(-10) || 'no-session',

        type: payload.type,
        action: payload.action,
        severity: payload.severity,

        target_resource: payload.target,
        metadata: payload.details,

        timestamp: new Date().toISOString(),
        // integrity_hash: Calculated by DB Trigger
      };

      console.log(`[AUDIT] [${payload.severity}] ${payload.action}`, logEntry);

      // Insert into Supabase 'audit_trail'
      const { error } = await supabase
        .from('audit_trail')
        .insert([logEntry]);

      if (error) {
        console.error("CRITICAL: Audit Log Failed to Persist", error);
        // Fallback: Attempt to log to a secondary system or alert admin
      }

    } catch (e) {
      console.error("CRITICAL: Audit Service Exception", e);
    }
  },

  /**
   * Log a critical security event immediately.
   */
  logCritical: async (action: string, details: any) => {
    await AuditService.logAction({
      action,
      type: AuditEventType.SYSTEM_INTEGRITY,
      severity: AuditSeverity.CRITICAL,
      details
    });
  }
};
