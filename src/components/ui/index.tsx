import { ReactNode, CSSProperties } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: boolean;
  style?: CSSProperties;
  onClick?: () => void;
}

export function Card({ children, className = "", padding = true, style, onClick }: CardProps) {
  return (
    <div
      className={`rounded-xl border ${padding ? "p-5" : ""} ${className}`}
      style={{ background: "var(--card)", borderColor: "var(--card-border)", ...style }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info";
}

const badgeStyles: Record<string, string> = {
  default: "bg-gray-500/20 text-gray-400",
  success: "bg-green-500/20 text-green-400",
  warning: "bg-yellow-500/20 text-yellow-400",
  danger:  "bg-red-500/20 text-red-400",
  info:    "bg-blue-500/20 text-blue-400",
};

export function Badge({ children, variant = "default" }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badgeStyles[variant]}`}>
      {children}
    </span>
  );
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export function Button({ children, variant = "primary", size = "md", loading, className = "", disabled, ...rest }: ButtonProps) {
  const base = "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none";
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm", lg: "px-6 py-2.5 text-base" };
  const variants: Record<string, React.CSSProperties> = {
    primary:   { background: "var(--accent)", color: "#fff" },
    secondary: { background: "var(--card)", color: "var(--foreground)", border: "1px solid var(--card-border)" },
    ghost:     { background: "transparent", color: "var(--foreground)" },
    danger:    { background: "rgba(220,38,38,0.15)", color: "#f87171", border: "1px solid rgba(220,38,38,0.3)" },
  };
  return (
    <button
      className={`${base} ${sizes[size]} ${className}`}
      style={variants[variant]}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = "", ...rest }: InputProps) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium" style={{ color: "var(--foreground)" }}>{label}</label>}
      <input
        className={`w-full px-3 py-2.5 rounded-lg text-sm border transition-colors focus:outline-none ${className}`}
        style={{
          background: "var(--input-bg)",
          borderColor: error ? "#ef4444" : "var(--input-border)",
          color: "var(--foreground)",
        }}
        {...rest}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export function Select({ label, error, children, className = "", ...rest }: SelectProps) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium" style={{ color: "var(--foreground)" }}>{label}</label>}
      <select
        className={`w-full px-3 py-2.5 rounded-lg text-sm border transition-colors focus:outline-none ${className}`}
        style={{
          background: "var(--input-bg)",
          borderColor: error ? "#ef4444" : "var(--input-border)",
          color: "var(--foreground)",
        }}
        {...rest}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-lg rounded-2xl border shadow-2xl animate-fade-in"
        style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--card-border)" }}>
            <h3 className="font-semibold" style={{ color: "var(--foreground)" }}>{title}</h3>
            <button onClick={onClose} className="p-1 rounded hover:bg-white/10 transition-colors text-gray-400 hover:text-white">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="px-6 py-5">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t flex justify-end gap-3" style={{ borderColor: "var(--card-border)" }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded animate-shimmer ${className}`} />
  );
}

interface TableProps {
  headers: string[];
  children: ReactNode;
  emptyText?: string;
}

export function Table({ headers, children, emptyText = "暂无数据" }: TableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--card-border)" }}>
      <table className="w-full text-sm" style={{ background: "var(--card)", color: "var(--foreground)" }}>
        <thead>
          <tr className="border-b" style={{ borderColor: "var(--card-border)", background: "var(--background)" }}>
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(children as any)?.props?.children === undefined || !children ? (
            <tr>
              <td colSpan={headers.length} className="px-4 py-8 text-center" style={{ color: "var(--muted)" }}>
                {emptyText}
              </td>
            </tr>
          ) : children}
        </tbody>
      </table>
    </div>
  );
}

export function TableRow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <tr className={`border-b transition-colors hover:bg-white/5 ${className}`} style={{ borderColor: "var(--card-border)" }}>
      {children}
    </tr>
  );
}

export function TableCell({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}
