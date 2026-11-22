import { Fragment, useState, type FormEvent } from 'react';
import { recordFromStored, saveReceiptStudentName, type StoredReceipt } from '../core/receipts';
import { buildReceipt, type Receipt } from '../core/receipt';
import { receiptToPdf } from '../core/receiptPdf';
import { Button } from './components/Button';
import { Card } from './components/Card';

function downloadReceipt(receipt: Receipt) {
  const bytes = receiptToPdf(receipt);
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const blob = new Blob([copy], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Wondral-Words-${receipt.receiptNumber}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * A stored checkout receipt, on the parent dashboard. The optional student
 * name is the only field a parent can change. No mailing address and no EIN.
 */
export function ReceiptPanel({
  row,
  onSaved,
}: {
  row: StoredReceipt;
  onSaved?: (row: StoredReceipt) => void;
}) {
  const [name, setName] = useState(row.student_name ?? '');
  const [current, setCurrent] = useState(row);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const receipt = buildReceipt(recordFromStored(current));
  const rows = [
    ['Seller', receipt.seller],
    ['Brand', receipt.brand],
    ['Receipt', receipt.receiptNumber],
    ['Purchase date', receipt.purchaseDate],
    ['Item', receipt.item],
    ['Service term', `${receipt.termStart} to ${receipt.termEnd}`],
    ['Base price', receipt.basePrice],
    ['Discounts', receipt.discounts],
    ['Tax', receipt.tax],
    ['Fees', receipt.fees],
    ['Total paid', receipt.totalPaid],
    ['Payment method', receipt.paymentMethod],
    ['Status', receipt.paidInFull],
    ['Student name', receipt.studentName ?? ''],
    ['Contact', receipt.supportEmail],
  ] as const;

  async function persistName(): Promise<StoredReceipt> {
    setError(null);
    const saved = await saveReceiptStudentName(current.id, name);
    const next = { ...current, student_name: saved };
    setCurrent(next);
    setName(saved ?? '');
    onSaved?.(next);
    return next;
  }

  async function save(event?: FormEvent) {
    event?.preventDefault();
    setBusy(true);
    try {
      await persistName();
    } catch (err) {
      setError((err as Error).message || 'Could not save the student name.');
    } finally {
      setBusy(false);
    }
  }

  async function download() {
    setBusy(true);
    setError(null);
    try {
      const next = name.trim() === (current.student_name ?? '') ? current : await persistName();
      downloadReceipt(buildReceipt(recordFromStored(next)));
    } catch (err) {
      setError((err as Error).message || 'Could not download the receipt.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="ww-stack" data-screen="parent-receipt">
      <div>
        <p className="ww-eyebrow">Receipt</p>
        <h2 className="text-gradient">Your purchase</h2>
      </div>
      <dl className="ww-receipt">
        {rows.map(([label, value]) => (
          <Fragment key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </Fragment>
        ))}
      </dl>
      <form className="ww-stack" onSubmit={(event) => void save(event)}>
        <label className="ww-receipt-label" htmlFor="ww-receipt-student">
          Student name, optional
        </label>
        <input
          id="ww-receipt-student"
          className="ww-input"
          value={name}
          maxLength={40}
          autoComplete="off"
          onChange={(event) => setName(event.target.value)}
        />
        {error ? (
          <div className="ww-notice is-error" role="alert">
            {error}
          </div>
        ) : null}
        <div className="ww-receipt-actions">
          <Button type="submit" variant="ghost" disabled={busy}>
            {busy ? 'Saving…' : 'Save student name'}
          </Button>
          <Button type="button" disabled={busy} onClick={() => void download()}>
            Download PDF
          </Button>
        </div>
      </form>
    </Card>
  );
}
