/**
 * Parent-facing receipt reads. Money columns are written by the webhook only.
 * A parent may set the optional student name on their own row.
 */
import { supabase, hasSupabaseConfig } from './supabase';
import { checkoutRecordFromStored, type StoredReceipt } from './checkoutRecord';
import { receiptTextOk } from './receiptPdf';
import type { CheckoutRecord } from './receipt';

export type { StoredReceipt };

export async function getLatestReceipt(parentId: string): Promise<StoredReceipt | null> {
  if (!hasSupabaseConfig) return null;
  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .eq('parent_id', parentId)
    .order('purchased_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as StoredReceipt | null) ?? null;
}

/** Blank clears the name. Anything else must fit on the PDF. */
export function cleanStudentName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return null;
  if (trimmed.length > 40) throw new Error('Student name must be 40 characters or fewer.');
  if (!receiptTextOk(trimmed)) {
    throw new Error('That name uses a character the receipt can’t print. Use plain letters.');
  }
  return trimmed;
}

export async function saveReceiptStudentName(receiptId: string, name: string): Promise<string | null> {
  const studentName = cleanStudentName(name);
  const { error } = await supabase
    .from('receipts')
    .update({ student_name: studentName })
    .eq('id', receiptId);
  if (error) throw error;
  return studentName;
}

export function recordFromStored(row: StoredReceipt): CheckoutRecord {
  return checkoutRecordFromStored(row);
}
