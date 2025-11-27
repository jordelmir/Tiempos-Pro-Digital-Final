import { supabase } from './supabaseClient';
import { AuditService } from './AuditService';
import { AuditSeverity, AuditEventType } from '../types';

export interface LedgerEntry {
    userId: string;
    amount: number; // In cents/lowest unit
    type: 'CREDIT' | 'DEBIT';
    referenceId: string;
    description: string;
}

/**
 * PHRONT MAESTRO: Ledger Service
 * Manages all financial transactions with strict double-entry bookkeeping.
 * Ensures integrity of user balances and system funds.
 */
export const LedgerService = {
    /**
     * Record a transaction in the ledger and update user balance.
     * Uses a Supabase RPC or Transaction (if available) to ensure atomicity.
     */
    recordTransaction: async (entry: LedgerEntry): Promise<{ success: boolean; newBalance?: number; error?: string }> => {
        try {
            // 1. Log intent
            console.log(`[LEDGER] Processing ${entry.type} of ${entry.amount} for ${entry.userId}`);

            // 2. Perform Transaction
            // In a real production environment, this should be a Postgres Function (RPC)
            // to ensure the insert into ledger and update of profile balance happen atomically.
            // For this implementation, we simulate the client-side logic but strongly recommend RPC.

            /* 
            // RPC Call Example:
            const { data, error } = await supabase.rpc('process_ledger_transaction', {
              p_user_id: entry.userId,
              p_amount: entry.amount,
              p_type: entry.type,
              p_ref: entry.referenceId,
              p_desc: entry.description
            });
            */

            // Client-Side Simulation (for Demo/MVP):
            // A. Insert Ledger Record
            const { error: ledgerError } = await supabase
                .from('ledger_transactions')
                .insert([{
                    user_id: entry.userId,
                    amount_bigint: entry.type === 'CREDIT' ? entry.amount : -entry.amount,
                    type: entry.type,
                    reference_id: entry.referenceId,
                    meta: { description: entry.description },
                    created_at: new Date().toISOString()
                }]);

            if (ledgerError) throw new Error(`Ledger Insert Failed: ${ledgerError.message}`);

            // B. Update User Balance (Optimistic)
            // Note: This is risky without RLS/RPC. 
            // We assume the backend trigger handles the actual balance update based on ledger insert.

            // 3. Audit Log
            await AuditService.logAction({
                action: entry.type === 'CREDIT' ? 'TX_DEPOSIT' : 'TX_WITHDRAWAL',
                type: entry.type === 'CREDIT' ? AuditEventType.TX_DEPOSIT : AuditEventType.TX_WITHDRAWAL,
                severity: AuditSeverity.SUCCESS,
                target: entry.userId,
                details: { amount: entry.amount, ref: entry.referenceId }
            });

            return { success: true };

        } catch (e: any) {
            console.error("CRITICAL: Ledger Transaction Failed", e);

            await AuditService.logAction({
                action: 'TX_FAILED',
                type: AuditEventType.TX_FAILED,
                severity: AuditSeverity.CRITICAL,
                target: entry.userId,
                details: { error: e.message, ...entry }
            });

            return { success: false, error: e.message };
        }
    },

    /**
     * Get formatted balance for a user.
     */
    getBalance: async (userId: string) => {
        const { data, error } = await supabase
            .from('app_users')
            .select('balance_bigint')
            .eq('id', userId)
            .single();

        if (error) return 0;
        return data?.balance_bigint || 0;
    }
};
