-- Rename midtrans_transaction_id to doku_invoice_id
ALTER TABLE orders RENAME COLUMN midtrans_transaction_id TO doku_invoice_id;
