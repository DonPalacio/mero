import { useState, useEffect } from "react";
import { dashboardService } from "../services/dashboard.service";
import { Movimiento } from "@/features/transactions/hooks/useTransactions";
import { Categoria } from "../components/Budgets";

export function useDashboard() {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [cajitas, setCajitas] = useState<Categoria[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function cargarDatos() {
      try {
        setIsLoading(true);
        // Promise.all permite hacer ambas peticiones a Supabase al mismo tiempo (más rápido)
        const [movsData, cajitasData] = await Promise.all([
          dashboardService.obtenerMovimientos(),
          dashboardService.obtenerCajitas(),
        ]);
        
        setMovimientos(movsData);
        setCajitas(cajitasData);
      } catch (error) {
        console.error("Error cargando datos del dashboard:", error);
      } finally {
        setIsLoading(false);
      }
    }

    cargarDatos();
  }, []);

  // 1. Calculamos los gastos agrupados por cada cajita
  const gastosPorCajita = movimientos
    .filter((m) => m.tipo === "gasto")
    .reduce((acumulador, mov) => {
      acumulador[mov.cajita] = (acumulador[mov.cajita] || 0) + mov.monto;
      return acumulador;
    }, {} as Record<string, number>);

  // 2. Calculamos los totales generales
  const ingresosTotales = movimientos
    .filter((m) => m.tipo === "ingreso")
    .reduce((sum, m) => sum + m.monto, 0);

  const gastosTotales = movimientos
    .filter((m) => m.tipo === "gasto")
    .reduce((sum, m) => sum + m.monto, 0);

  const saldoDisponible = ingresosTotales - gastosTotales;

  // Función para cuando el usuario edite el input de presupuesto en la UI
  const handleBudgetChange = (name: string, value: string) => {
    // Aquí luego conectaremos con Supabase para actualizar el budget
    console.log(`Actualizar presupuesto de ${name} a ${value}`);
  };

  return {
    movimientos,
    cajitas,
    gastosPorCajita,
    ingresosTotales,
    gastosTotales,
    saldoDisponible,
    isLoading,
    handleBudgetChange
  };
}