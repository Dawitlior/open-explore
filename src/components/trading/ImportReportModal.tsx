import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle2, XCircle, FileSpreadsheet, Info } from 'lucide-react';

export type ImportReportSeverity = 'success' | 'partial' | 'error';

export interface ImportReportProps {
  open: boolean;
  onClose: () => void;
  isRTL: boolean;
  severity: ImportReportSeverity;
  fileName?: string;
  imported: number;
  skipped: number;
  errors: string[];
  hint?: string;
}

const T = (isRTL: boolean, he: string, en: string) => (isRTL ? he : en);

/**
 * Friendly explanation for common backend error strings.
 * Returns null when there is no special-cased message — caller falls back to the raw error.
 */
function explainError(raw: string, isRTL: boolean): { title: string; body: string; fix: string } | null {
  const r = raw.toLowerCase();

  if (r.includes('apple numbers') || r.includes('.iwa')) {
    return {
      title: T(isRTL, 'הקובץ הוא Apple Numbers ולא Excel', 'File is Apple Numbers, not real Excel'),
      body: T(isRTL,
        'הקובץ שהעלית נשמר בפורמט של Apple Numbers (גם אם הסיומת .xlsx). אורקה קוראת רק Excel אמיתי.',
        'Your file is in Apple Numbers format (even with an .xlsx extension). Orca only reads real Excel files.'),
      fix: T(isRTL,
        'ב-Numbers: File → Export To → Excel… (.xlsx), ואז העלה שוב את הקובץ החדש.',
        'In Numbers: File → Export To → Excel… (.xlsx), then re-upload the new file.'),
    };
  }

  if (r.includes('could not detect a real header row') || r.includes('לא זוהתה שורת כותרות')) {
    return {
      title: T(isRTL, 'לא זוהתה שורת כותרות', 'Header row was not detected'),
      body: T(isRTL,
        'אורקה דילגה על שורות ריקות/כותרות דוח, אבל לא מצאה שורה שמכילה עמודות נתונים מוכרות כמו תאריך, שם הנכס, כיוון, כניסה, יציאה או P&L.',
        'Orca skipped blank/report-title rows, but could not find a row with recognizable data columns such as Date, Symbol, Direction, Entry, Exit or P&L.'),
      fix: T(isRTL,
        'ודא שיש בקובץ שורת כותרות ברורה מעל הנתונים, או השתמש בתבנית הרשמית של אורקה.',
        'Make sure the file has a clear header row above the data, or use Orca’s official template.'),
    };
  }

  if (r.includes('# / nr.') || r.includes('missing required "# / nr.')) {
    return {
      title: T(isRTL, 'חסרה עמודת מזהה (# / Nr.)', 'Missing identifier column (# / Nr.)'),
      body: T(isRTL,
        'בקובץ אין עמודת מזהה עסקה. זה לא חייב להפיל את הייבוא — אורקה יכולה ליצור מזהים אוטומטיים, אבל עדיף שתהיה עמודת # / Nr. כדי למנוע כפילויות.',
        'The file has no trade identifier column. This does not have to block import — Orca can generate IDs automatically, but # / Nr. is recommended to prevent duplicates.'),
      fix: T(isRTL,
        'אם זה קובץ יומן של אורקה, הוסף # או Nr. אם זה דוח ברוקר, אפשר להמשיך ולתקן כפילויות ידנית במידת הצורך.',
        'If this is an Orca journal file, add # or Nr. If this is a broker statement, you can continue and handle duplicates manually if needed.'),
    };
  }

  if (r.includes('main sheet must include headers')) {
    return {
      title: T(isRTL, 'מבנה Main Sheet לא תקין', 'Main Sheet structure is invalid'),
      body: T(isRTL,
        'אורקה מצפה ל-Main Sheet עם שלוש שכבות: (1) שורת כותרות, (2) שורת תיאור, (3) שורות נתונים. בקובץ שלך חסרה אחת מהן.',
        'Orca expects the Main Sheet to have three layers: (1) header row, (2) description row, (3) data rows. One of them is missing in your file.'),
      fix: T(isRTL,
        'הוסף שורת כותרות (#, Coin, Direction, Entry, Stop Loss, Exit וכו’) בשורה 1, שורת תיאור בשורה 2, והנתונים מתחילים בשורה 3.',
        'Add a header row (#, Coin, Direction, Entry, Stop Loss, Exit, …) in row 1, a description row in row 2, and start data from row 3.'),
    };
  }

  if (r.includes('main sheet not found')) {
    return {
      title: T(isRTL, 'לא נמצא גיליון ראשי', 'Main Sheet not found'),
      body: T(isRTL,
        'הקובץ לא מכיל גיליון בשם Main / Trades / Journal שאורקה יכולה לזהות.',
        'The workbook does not contain a sheet named Main / Trades / Journal that Orca can recognize.'),
      fix: T(isRTL,
        'שנה את שם הגיליון הראשי ל-"Main Sheet" או "Trades" ונסה שוב.',
        'Rename your main sheet to "Main Sheet" or "Trades" and try again.'),
    };
  }

  if (r.includes('invalid entry date')) {
    return {
      title: T(isRTL, 'תאריכי כניסה לא חוקיים', 'Invalid entry dates'),
      body: T(isRTL,
        'חלק מהשורות נדלגו כי לא היה אפשר לפענח את עמודת ENTRY DATE/TIME.',
        'Some rows were skipped because the ENTRY DATE/TIME column could not be parsed.'),
      fix: T(isRTL,
        'השתמש בפורמט dd/mm/yyyy hh:mm או תאריך אקסל סטנדרטי בעמודה ENTRY DATE/TIME.',
        'Use dd/mm/yyyy hh:mm or a standard Excel date in the ENTRY DATE/TIME column.'),
    };
  }

  if (r.includes('invalid format') || r.includes('json')) {
    return {
      title: T(isRTL, 'קובץ JSON לא בפורמט אורקה', 'JSON file is not in Orca format'),
      body: T(isRTL,
        'קובץ ה-JSON צריך להיות מערך של עסקאות או אובייקט עם המפתח "trades".',
        'The JSON file must be an array of trades or an object with a "trades" key.'),
      fix: T(isRTL,
        'ייצא מאורקה (Settings → Backup → Export JSON) והשתמש באותו פורמט.',
        'Export from Orca (Settings → Backup → Export JSON) and use the same format.'),
    };
  }

  return null;
}

export function ImportReportModal({ open, onClose, isRTL, severity, fileName, imported, skipped, errors, hint }: ImportReportProps) {
  const explanations = errors.map(e => ({ raw: e, exp: explainError(e, isRTL) }));

  const icon = severity === 'success'
    ? <CheckCircle2 className="h-6 w-6 text-emerald-400" />
    : severity === 'partial'
      ? <AlertTriangle className="h-6 w-6 text-amber-400" />
      : <XCircle className="h-6 w-6 text-rose-400" />;

  const title = severity === 'success'
    ? T(isRTL, 'ייבוא הסתיים בהצלחה', 'Import completed')
    : severity === 'partial'
      ? T(isRTL, 'ייבוא חלקי — חלק מהשורות לא נטענו', 'Partial import — some rows were skipped')
      : T(isRTL, 'ייבוא נכשל', 'Import failed');

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        dir={isRTL ? 'rtl' : 'ltr'}
        className="max-w-2xl border-cyan-500/20 bg-[#061326] text-slate-100 shadow-[0_0_60px_rgba(34,211,238,0.15)]"
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            {icon}
            <DialogTitle className="text-lg font-semibold tracking-wide text-slate-50">{title}</DialogTitle>
          </div>
          {fileName && (
            <DialogDescription className="flex items-center gap-2 pt-1 text-xs text-slate-400">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span className="font-mono">{fileName}</span>
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Stats strip */}
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-center">
          <div>
            <div className="text-2xl font-bold text-emerald-400">{imported}</div>
            <div className="text-xs uppercase tracking-wider text-slate-400">{T(isRTL, 'נטענו', 'Imported')}</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-400">{skipped}</div>
            <div className="text-xs uppercase tracking-wider text-slate-400">{T(isRTL, 'נדלגו', 'Skipped')}</div>
          </div>
        </div>

        {/* Explanations */}
        {explanations.length > 0 && (
          <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
            {explanations.map((item, i) => (
              <div key={i} className="rounded-lg border border-slate-800 bg-slate-900/30 p-3">
                {item.exp ? (
                  <>
                    <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-cyan-300">
                      <Info className="h-4 w-4" />
                      {item.exp.title}
                    </div>
                    <p className="text-sm text-slate-300">{item.exp.body}</p>
                    <div className="mt-2 rounded border-s-2 border-cyan-500/60 bg-cyan-500/5 px-3 py-2 text-xs text-cyan-100">
                      <span className="font-semibold">{T(isRTL, 'תיקון: ', 'Fix: ')}</span>
                      {item.exp.fix}
                    </div>
                  </>
                ) : (
                  <p className="font-mono text-xs text-slate-300">{item.raw}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {hint && (
          <p className="rounded border border-slate-800 bg-slate-900/40 p-2 text-xs text-slate-400">{hint}</p>
        )}

        {severity !== 'error' && imported === 0 && explanations.length === 0 && (
          <p className="text-sm text-slate-400">
            {T(isRTL, 'לא נמצאו עסקאות תקפות בקובץ.', 'No valid trades were found in the file.')}
          </p>
        )}

        <DialogFooter>
          <Button
            onClick={onClose}
            className="bg-cyan-500 text-slate-950 hover:bg-cyan-400"
          >
            {T(isRTL, 'הבנתי', 'Got it')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
