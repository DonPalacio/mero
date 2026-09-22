import { Categoria } from '../components/Budgets';

export function useDashboard() {
  // 1. Estados y datos (Mocks por ahora)
  const gastosPorCajita: Record<string, number> = {
    "Deudas / Tarjetas de Crédito": 500000,
    "Servicios Públicos y Conectividad": 300000,
    Suscripciones: 100000,
    "Transporte y Mantenimiento": 200000,
    "Manutención: Romeo": 150000,
    "Saldo Disponible": 150000,
  };

  const categoriasDePrueba: Categoria[] = [
    { name: "Suscripciones", tipo: "gasto", budget: 150000 },
    { name: "Transporte y Mantenimiento", tipo: "gasto", budget: 250000 },
    { name: "Deudas / Tarjetas de Crédito", tipo: "gasto", budget: 450000 },
  ];

  // 2. Funciones manejadoras
  const handleBudgetChange = (name: string, value: string) => {
    console.log(`Actualizar presupuesto de ${name} a ${value}`);
    // Aquí irá la lógica de Supabase más adelante
  };

  // 3. Retornamos todo lo que la vista necesita
  return {
    gastosPorCajita,
    categoriasDePrueba,
    handleBudgetChange,
  };
}