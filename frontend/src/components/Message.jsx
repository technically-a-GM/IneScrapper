import {
  Activity,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

function Message({ tone = "info", children }) {
  const Icon =
    tone === "error"
      ? AlertTriangle
      : tone === "success"
        ? CheckCircle2
        : Activity;

  return (
    <div className={`message message-${tone}`}>
      <Icon size={18} />
      <span>{children}</span>
    </div>
  );
}

export default Message;