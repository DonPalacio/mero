import { fmt } from "@/lib/utils";
import { useCountUp } from "@/hooks/useCountUp";

interface AnimatedNumberProps {
  value: number;
  className?: string;
}

// Cifra con conteo animado. El texto inicial es el valor final (SSR y lectores de pantalla ven
// siempre el dato real); la animación solo cambia lo que se pinta.
export default function AnimatedNumber({ value, className }: AnimatedNumberProps) {
  const ref = useCountUp(value);
  return (
    <span ref={ref} className={className}>
      {fmt(value)}
    </span>
  );
}
