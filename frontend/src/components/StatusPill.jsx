function StatusPill({ tone = "neutral", children }) {
  return (
    <span className={`pill pill-${tone}`}>
      {children}
    </span>
  );
}

export default StatusPill;