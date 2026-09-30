const Pagination = ({ page, total, pageSize, onChange }) => {
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1);

  const withEllipsis = pages.reduce((acc, p, i, arr) => {
    if (i > 0 && p - arr[i - 1] > 1) acc.push("...");
    acc.push(p);
    return acc;
  }, []);

  const btn = (disabled, label, onClick) => (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        border: "1px solid #e2e8f0",
        background: disabled ? "#f1f5f9" : "white",
        color: disabled ? "#94a3b8" : "#0f172a",
        borderRadius: 6,
        padding: "5px 10px",
        fontSize: 12,
        fontWeight: 700,
        cursor: disabled ? "default" : "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, flexWrap: "wrap", gap: 8 }}>
      <span style={{ fontSize: 12, color: "#64748b" }}>
        Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
      </span>
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        {btn(page === 1, "‹ Prev", () => onChange(page - 1))}
        {withEllipsis.map((p, i) =>
          p === "..." ? (
            <span key={i} style={{ padding: "5px 4px", fontSize: 12, color: "#94a3b8" }}>…</span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p)}
              style={{
                border: "1px solid #e2e8f0",
                background: p === page ? "#1d4ed8" : "#f1f5f9",
                color: p === page ? "white" : "#0f172a",
                borderRadius: 6,
                padding: "5px 0",
                minWidth: 30,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {p}
            </button>
          )
        )}
        {btn(page === totalPages, "Next ›", () => onChange(page + 1))}
      </div>
    </div>
  );
};

export default Pagination;
