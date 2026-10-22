-- Sổ cống hiến chỉ ghi thêm (ARCHITECTURE.md §7.2): chặn UPDATE / DELETE ngay trong CSDL.
-- Sai thì ghi bút toán điều chỉnh. TRUNCATE (dùng khi nạp lại dữ liệu demo) không kích hoạt trigger theo dòng.
CREATE OR REPLACE FUNCTION ledger_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'ledger_entries là sổ chỉ ghi thêm — không được % bút toán', TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER ledger_entries_append_only
  BEFORE UPDATE OR DELETE ON ledger_entries
  FOR EACH ROW EXECUTE FUNCTION ledger_append_only();
