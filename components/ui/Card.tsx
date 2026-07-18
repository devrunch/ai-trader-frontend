import { cn } from "@/lib/theme";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: boolean;
}

export function Card({ children, className = "", hover = false, padding = false }: CardProps) {
  return (
    <div className={`${hover ? cn.cardHover : cn.card} ${padding ? "p-4" : ""} ${className}`}>
      {children}
    </div>
  );
}
