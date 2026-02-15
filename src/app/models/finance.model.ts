/**
 * Finance entry for tracking expenses/income
 */
export interface FinanceEntry {
    /** Unique identifier */
    id: string;
    /** Date of the transaction (ISO date string YYYY-MM-DD) */
    date: string;
    /** Description/title of the transaction */
    title: string;
    /** Amount (positive for income, negative for expense) */
    amount: number;
    /** Optional category for grouping */
    category?: string;
}
