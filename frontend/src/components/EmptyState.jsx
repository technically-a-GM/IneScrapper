import { Database } from "lucide-react";

function EmptyState({ icon = Database, title, body }) {
  const Icon = icon;

  return (
    <div className="empty">
      <Icon size={28} />
      <strong>{title}</strong>
      <span>{body}</span>
    </div>
  );
}

export default EmptyState;